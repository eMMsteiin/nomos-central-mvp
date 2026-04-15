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
    const { deck_id, source_ids, max_cards = 15, focus } = await req.json();

    if (!deck_id || !source_ids || !Array.isArray(source_ids) || source_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'deck_id and source_ids are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validMaxCards = Math.min(Math.max(1, max_cards), 30);

    // Fetch sources
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

    // Concatenate source texts
    let combinedText = '';
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      combinedText += `=== FONTE ${i + 1}: ${src.file_name} ===\n${src.extracted_text || ''}\n\n`;
    }

    // Truncate if too long
    const MAX_CHARS = 50000;
    let truncated = false;
    if (combinedText.length > MAX_CHARS) {
      combinedText = combinedText.substring(0, MAX_CHARS);
      truncated = true;
    }

    console.log(`[generate-from-sources] Combined text: ${combinedText.length} chars from ${sources.length} sources, truncated: ${truncated}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const systemPrompt = `Você é um especialista em criar flashcards para estudo eficiente.

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

${focus ? 'FOCO ESPECIAL: ' + focus : ''}

Use a função generate_flashcards para retornar os flashcards.`;

    const userMessage = `Analise o seguinte material e gere flashcards baseados EXCLUSIVAMENTE neste conteúdo:\n\n${combinedText}${truncated ? '\n\n[AVISO: Material foi truncado por ser muito extenso. Foque nos conceitos já presentes.]' : ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_flashcards',
            description: 'Gera flashcards estruturados a partir do material analisado',
            parameters: {
              type: 'object',
              properties: {
                flashcards: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      front: { type: 'string', description: 'Pergunta ou conceito (frente do card)' },
                      back: { type: 'string', description: 'Resposta ou explicação (verso do card)' },
                    },
                    required: ['front', 'back'],
                  },
                },
              },
              required: ['flashcards'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_flashcards' } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error('[generate-from-sources] AI error:', status, errorText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Aguarde alguns segundos e tente novamente.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos esgotados. Adicione créditos à sua conta.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== 'generate_flashcards') {
      return new Response(JSON.stringify({ error: 'Não foi possível gerar flashcards a partir das fontes.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    const flashcards = result.flashcards || [];

    if (flashcards.length === 0) {
      return new Response(JSON.stringify({ error: 'Não foi possível extrair flashcards das fontes. O conteúdo pode ser insuficiente.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-from-sources] Generated ${flashcards.length} flashcards from ${sources.length} sources`);

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
