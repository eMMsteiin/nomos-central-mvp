import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: 'Authorization header missing', status: 401 };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  return { userId: user.id, supabase };
}

// Chunked base64 encoding to avoid stack overflow on large files
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

async function extractTextFromImage(imageBytes: Uint8Array, mimeType: string, apiKey: string): Promise<string> {
  const base64 = uint8ArrayToBase64(imageBytes);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extraia TODO o texto visível nesta imagem preservando estrutura. Se for slide, extraia título e bullets. Se for caderno manuscrito, transcreva fielmente. Retorne apenas o texto extraído, sem comentários adicionais.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[process-deck-source] Vision API error:', response.status, errorText);
    throw new Error(`Vision API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function extractTextFromPdf(pdfBytes: Uint8Array, apiKey: string): Promise<string> {
  const base64 = uint8ArrayToBase64(pdfBytes);
  console.log(`[process-deck-source] PDF base64 length: ${base64.length} chars (~${Math.round(pdfBytes.length / 1024)}KB)`);
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extraia TODO o texto deste documento PDF preservando a estrutura. Mantenha títulos, subtítulos, bullets e parágrafos. Retorne apenas o texto extraído.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64}`
              }
            }
          ]
        }
      ],
      max_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[process-deck-source] PDF extraction API error:', response.status, errorText);
    throw new Error(`PDF extraction error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  console.log(`[process-deck-source] PDF extraction returned ${text.length} chars`);
  return text;
}

/**
 * Extracts text from a .pptx file by unzipping it and parsing the slide XMLs.
 * A .pptx is an Office Open XML zip; slides live in `ppt/slides/slideN.xml`
 * and the text we want is inside <a:t> elements.
 * The presentation order is defined by ppt/_rels/presentation.xml.rels referenced
 * by ppt/presentation.xml, but ordering by the numeric suffix of slideN.xml
 * matches the canonical order in 99% of decks (PowerPoint, Keynote, Google Slides).
 */
async function extractTextFromPptx(pptxBytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(pptxBytes);

  // Collect slide files: ppt/slides/slide1.xml, slide2.xml, ...
  const slideEntries: Array<{ index: number; path: string }> = [];
  zip.forEach((relativePath) => {
    const m = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (m) slideEntries.push({ index: parseInt(m[1], 10), path: relativePath });
  });

  if (slideEntries.length === 0) {
    throw new Error('Nenhum slide encontrado no arquivo .pptx');
  }

  slideEntries.sort((a, b) => a.index - b.index);
  console.log(`[process-deck-source] PPTX has ${slideEntries.length} slides`);

  const parts: string[] = [];
  for (const { index, path } of slideEntries) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');

    // Extract text from <a:t>...</a:t> runs. Also handle self-closed and namespaces variants.
    // Use a non-greedy match across the run.
    const matches = [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)];
    const texts = matches.map((m) => decodeXmlEntities(m[1])).filter((t) => t.length > 0);

    // Group runs into lines using paragraph boundaries (<a:p>) for readability.
    // Simple approach: split the XML by </a:p>, extract <a:t> per paragraph, join with newline.
    const paragraphs = xml.split(/<\/a:p>/);
    const lines: string[] = [];
    for (const para of paragraphs) {
      const runs = [...para.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
        .map((m) => decodeXmlEntities(m[1]));
      const line = runs.join('').trim();
      if (line) lines.push(line);
    }

    const slideText = lines.length > 0 ? lines.join('\n') : texts.join(' ').trim();
    if (slideText) {
      parts.push(`--- Slide ${index} ---\n${slideText}`);
    }
  }

  // Also pull notes if present (ppt/notesSlides/notesSlideN.xml)
  const noteEntries: Array<{ index: number; path: string }> = [];
  zip.forEach((relativePath) => {
    const m = relativePath.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/);
    if (m) noteEntries.push({ index: parseInt(m[1], 10), path: relativePath });
  });
  noteEntries.sort((a, b) => a.index - b.index);

  for (const { index, path } of noteEntries) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    const runs = [...xml.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)]
      .map((m) => decodeXmlEntities(m[1]).trim())
      .filter((t) => t.length > 0);
    if (runs.length > 0) {
      parts.push(`--- Notas do Slide ${index} ---\n${runs.join('\n')}`);
    }
  }

  const result = parts.join('\n\n');
  console.log(`[process-deck-source] PPTX extraction returned ${result.length} chars from ${slideEntries.length} slides`);
  return result;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/**
 * Extracts text from a .docx file (OOXML zip).
 * Main content lives in `word/document.xml`; text runs are <w:t>...</w:t>,
 * paragraphs are <w:p>, line breaks are <w:br/>, tabs are <w:tab/>.
 * Headers/footers (word/header*.xml, word/footer*.xml) are also pulled.
 */
async function extractTextFromDocx(docxBytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(docxBytes);

  const parseDocxXml = (xml: string): string => {
    // Split by paragraph boundaries to preserve structure.
    const paragraphs = xml.split(/<\/w:p>/);
    const lines: string[] = [];
    for (const para of paragraphs) {
      // Replace breaks/tabs with whitespace BEFORE pulling <w:t> runs.
      const normalized = para
        .replace(/<w:br\s*\/?>/g, '\n')
        .replace(/<w:tab\s*\/?>/g, '\t');
      const runs = [...normalized.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((m) => decodeXmlEntities(m[1]));
      const line = runs.join('').trim();
      if (line) lines.push(line);
    }
    return lines.join('\n');
  };

  const parts: string[] = [];

  // Main document body
  const mainFile = zip.file('word/document.xml');
  if (!mainFile) {
    throw new Error('Arquivo .docx inválido: word/document.xml não encontrado');
  }
  const mainXml = await mainFile.async('string');
  const mainText = parseDocxXml(mainXml);
  if (mainText) parts.push(mainText);

  // Headers (word/header1.xml, header2.xml, ...)
  const headerPaths: string[] = [];
  const footerPaths: string[] = [];
  zip.forEach((relativePath) => {
    if (/^word\/header\d+\.xml$/.test(relativePath)) headerPaths.push(relativePath);
    if (/^word\/footer\d+\.xml$/.test(relativePath)) footerPaths.push(relativePath);
  });

  for (const path of headerPaths.sort()) {
    const file = zip.file(path);
    if (!file) continue;
    const text = parseDocxXml(await file.async('string'));
    if (text) parts.push(`--- Cabeçalho ---\n${text}`);
  }
  for (const path of footerPaths.sort()) {
    const file = zip.file(path);
    if (!file) continue;
    const text = parseDocxXml(await file.async('string'));
    if (text) parts.push(`--- Rodapé ---\n${text}`);
  }

  // Footnotes / endnotes if present
  for (const path of ['word/footnotes.xml', 'word/endnotes.xml']) {
    const file = zip.file(path);
    if (!file) continue;
    const text = parseDocxXml(await file.async('string'));
    if (text) parts.push(`--- ${path.includes('foot') ? 'Notas de Rodapé' : 'Notas Finais'} ---\n${text}`);
  }

  const result = parts.join('\n\n');
  console.log(`[process-deck-source] DOCX extraction returned ${result.length} chars`);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authResult = await verifyUser(req);
    if ('error' in authResult) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userId, supabase } = authResult;
    const { source_id, storage_path, file_type } = await req.json();

    if (!source_id || !storage_path || !file_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-deck-source] Processing source ${source_id}, type: ${file_type}, path: ${storage_path}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('deck-sources')
      .download(storage_path);

    if (downloadError || !fileData) {
      console.error('[process-deck-source] Download error:', downloadError?.message || 'No data');
      await supabase.from('deck_sources').update({ status: 'error' }).eq('id', source_id);
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    console.log(`[process-deck-source] Downloaded file: ${fileBytes.length} bytes`);
    let extractedText = '';

    try {
      if (file_type === 'pdf') {
        extractedText = await extractTextFromPdf(fileBytes, LOVABLE_API_KEY);
      } else if (file_type === 'image') {
        const ext = storage_path.split('.').pop()?.toLowerCase() || 'png';
        const mimeMap: Record<string, string> = {
          'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
          'heic': 'image/heic', 'webp': 'image/webp',
        };
        const mimeType = mimeMap[ext] || 'image/png';
        extractedText = await extractTextFromImage(fileBytes, mimeType, LOVABLE_API_KEY);
      } else if (file_type === 'pptx') {
        extractedText = await extractTextFromPptx(fileBytes);
      } else {
        throw new Error(`Unsupported file type: ${file_type}`);
      }
    } catch (extractError) {
      const errorMsg = extractError instanceof Error ? extractError.message : String(extractError);
      const errorStack = extractError instanceof Error ? extractError.stack : '';
      console.error(`[process-deck-source] Extraction failed for source ${source_id}:`, errorMsg);
      console.error('[process-deck-source] Stack:', errorStack);
      await supabase.from('deck_sources').update({ status: 'error' }).eq('id', source_id);
      return new Response(JSON.stringify({ error: 'Não conseguimos ler este arquivo. Tente exportar como PDF ou tirar uma foto mais nítida.', details: errorMsg }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count words
    const wordCount = extractedText.trim().split(/\s+/).filter(w => w.length > 0).length;
    console.log(`[process-deck-source] Extracted ${wordCount} words from source ${source_id}`);

    // Update the source record
    const { error: updateError } = await supabase.from('deck_sources').update({
      extracted_text: extractedText,
      status: wordCount < 10 ? 'error' : 'ready',
    }).eq('id', source_id);

    if (updateError) {
      console.error('[process-deck-source] DB update error:', updateError.message);
      throw updateError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      word_count: wordCount,
      status: wordCount < 10 ? 'error' : 'ready',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[process-deck-source] Unhandled error:', errorMsg);
    console.error('[process-deck-source] Stack:', errorStack);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
