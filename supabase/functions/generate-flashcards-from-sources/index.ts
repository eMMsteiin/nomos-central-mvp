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

function buildSystemPrompt(cardType: string, validMaxCards: number, focus?: string): string {
  if (cardType === 'cloze') {
    return `Você é um especialista em criar flashcards do tipo Cloze para estudo eficiente.

Sua tarefa é analisar o material fornecido e criar flashcards cloze baseados EXCLUSIVAMENTE neste conteúdo.

TIPO CLOZE: cada card é uma sentença completa com lacunas marcadas.

REGRAS CRÍTICAS:
- Use APENAS informações presentes no material fornecido
- NÃO adicione informações externas ou do seu conhecimento geral
- Crie entre 5 e ${validMaxCards} cards dependendo do conteúdo
- Cada card deve ser uma frase ou parágrafo curto e autocontido
- Identifique os termos mais importantes (nomes, definições, datas, fórmulas) e substitua-os por {{c1::termo}}, {{c2::termo}}, etc.
- Use entre 1 e 3 lacunas por card
- O campo "front" deve conter o texto COMPLETO com os marcadores {{c1::...}}, {{c2::...}}, etc.
- O campo "back" deve ser o mesmo texto SEM os marcadores (texto puro completo)

EXEMPLOS de bons cards cloze:
- front: "A {{c1::fotossíntese}} é o processo pelo qual as plantas produzem {{c2::glicose}} usando luz solar."
  back: "A fotossíntese é o processo pelo qual as plantas produzem glicose usando luz solar."
- front: "A Proclamação da República no Brasil ocorreu em {{c1::15 de novembro de 1889}}."
  back: "A Proclamação da República no Brasil ocorreu em 15 de novembro de 1889."

${focus ? 'FOCO ESPECIAL: ' + focus : ''}`;
  }

  return `Você é um especialista em criar flashcards para estudo eficiente.

Sua tarefa é analisar o material fornecido pelo estudante e criar flashcards baseados EXCLUSIVAMENTE neste conteúdo.

REGRAS CRÍTICAS:
- Use APENAS informações presentes no material fornecido
- NÃO adicione informações externas ou do seu conhecimento geral
- Se o professor usou um exemplo específico, use esse exemplo
- Se houver uma fórmula no material, use exatamente ela
- Priorize: definições do professor, exemplos dados em aula, fórmulas apresentadas, datas e eventos mencionados, conceitos destacados ou sublinhados

QUALIDADE DOS CARDS:
- Cada pergunta deve testar compreensão, não só memorização
- Respostas devem ser concisas mas completas
- Crie entre 5 e ${validMaxCards} cards dependendo do conteúdo
- Cubra os conceitos mais importantes do material

${focus ? 'FOCO ESPECIAL: ' + focus : ''}`;
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
    const { deck_id, source_ids, max_cards = 15, focus, card_type = 'basic' } = await req.json();

    if (!deck_id || !source_ids || !Array.isArray(source_ids) || source_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'deck_id and source_ids are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validMaxCards = Math.min(Math.max(1, max_cards), 30);

    const { data: sources, error: fetchError } = await supabase
      .from('deck_sources')
      .select('id, file_name, extracted_text, status')
      .in('id', source_ids)
      .eq('user_id', userId)
      .eq('status', 'ready');

    if (fetchError) {
      console.error('[generate-from-sources] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!sources || sources.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma fonte pronta encontrada.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let combinedText = '';
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      combinedText += `=== FONTE ${i + 1}: ${src.file_name} ===\n${src.extracted_text || ''}\n\n`;
    }

    const MAX_CHARS = 50000;
    let truncated = false;
    if (combinedText.length > MAX_CHARS) {
      combinedText = combinedText.substring(0, MAX_CHARS);
      truncated = true;
    }

    console.log(`[generate-from-sources] ${combinedText.length} chars, ${sources.length} sources, card_type: ${card_type}, truncated: ${truncated}`);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    const systemPrompt = buildSystemPrompt(card_type, validMaxCards, focus);

    const userMessage = `Analise o seguinte material e gere flashcards baseados EXCLUSIVAMENTE neste conteúdo:\n\n${combinedText}${truncated ? '\n\n[AVISO: Material foi truncado por ser muito extenso. Foque nos conceitos já presentes.]' : ''}`;

    const SAFETY_SETTINGS = [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
    ];

    const requestBody = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        maxOutputTokens: 16384,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            flashcards: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  front: { type: 'string' },
                  back: { type: 'string' },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: ['flashcards'],
        },
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const callGemini = async (): Promise<Array<{ front: string; back: string }>> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), signal: controller.signal }
        );
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini ${response.status}: ${errText.slice(0, 400)}`);
        }
        const data = await response.json();
        const candidate = data.candidates?.[0];
        const rawText: string = candidate?.content?.parts?.[0]?.text || '';
        const finishReason: string | undefined = candidate?.finishReason;
        if (!rawText) {
          const promptFeedback = data.promptFeedback;
          const blockReason = promptFeedback?.blockReason;
          const safetyRatings = candidate?.safetyRatings || promptFeedback?.safetyRatings;
          const blockedRatings = Array.isArray(safetyRatings)
            ? safetyRatings.filter((r: { blocked?: boolean }) => r.blocked).map((r: { category?: string }) => r.category).join(',')
            : '';
          const diagnosis = [
            `finishReason=${finishReason || 'unknown'}`,
            blockReason ? `blockReason=${blockReason}` : '',
            blockedRatings ? `blockedCategories=${blockedRatings}` : '',
          ].filter(Boolean).join(' | ');
          console.error('[generate-from-sources] empty response. Full data:', JSON.stringify(data).slice(0, 800));
          throw new Error(`Gemini empty response (${diagnosis})`);
        }
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (parseErr) {
          throw new Error(`Failed to parse JSON: ${parseErr instanceof Error ? parseErr.message : 'unknown'}. Raw text start: ${rawText.slice(0, 200)}`);
        }
        const cards = Array.isArray(parsed) ? parsed : parsed.flashcards;
        if (!Array.isArray(cards) || cards.length === 0) throw new Error(`Parsed JSON has no flashcards array. Got: ${JSON.stringify(parsed).slice(0, 200)}`);
        return cards;
      } finally {
        clearTimeout(timeout);
      }
    };

    let flashcards: Array<{ front: string; back: string }>;
    let lastErrorMsg = '';
    try {
      flashcards = await callGemini();
    } catch (err) {
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      console.warn('[generate-from-sources] First attempt failed:', lastErrorMsg, '— retrying in 3s');
      await new Promise(r => setTimeout(r, 3000));
      try {
        flashcards = await callGemini();
      } catch (retryErr) {
        lastErrorMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error('[generate-from-sources] Retry also failed:', lastErrorMsg);
        return new Response(JSON.stringify({ error: `Falha ao gerar: ${lastErrorMsg}` }), {
          status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (flashcards.length === 0) {
      return new Response(JSON.stringify({ error: 'Não foi possível extrair flashcards das fontes. O conteúdo pode ser insuficiente.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-from-sources] Generated ${flashcards.length} flashcards (type: ${card_type}) from ${sources.length} sources`);

    return new Response(JSON.stringify({ flashcards, truncated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-from-sources] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro ao gerar flashcards' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
