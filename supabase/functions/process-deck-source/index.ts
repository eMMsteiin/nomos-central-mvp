import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

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
        const base64 = uint8ArrayToBase64(fileBytes);
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: 'Extraia TODO o texto desta apresentação. Para cada slide, extraia título, subtítulo, bullets e qualquer texto visível. Retorne no formato:\n\n--- Slide 1 ---\n[conteúdo]\n\n--- Slide 2 ---\n[conteúdo]\n\nRetorne apenas o texto extraído.' },
                { type: 'image_url', image_url: { url: `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${base64}` } }
              ]
            }],
            max_tokens: 16000,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[process-deck-source] PPTX extraction error:', response.status, errorText);
          throw new Error(`PPTX extraction error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        extractedText = data.choices?.[0]?.message?.content || '';
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
