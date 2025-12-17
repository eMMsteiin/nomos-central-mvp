import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, maxCards = 10 } = await req.json();

    if (!text || text.length < 50) {
      return new Response(
        JSON.stringify({ error: 'Texto muito curto. Cole pelo menos 50 caracteres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log(`Generating flashcards from text (${text.length} chars), max: ${maxCards}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em criar flashcards para estudo eficiente.

Sua tarefa é analisar o texto fornecido e extrair os conceitos mais importantes, criando flashcards no formato pergunta/resposta.

REGRAS:
- Crie entre 3 e ${maxCards} flashcards dependendo da quantidade de conteúdo
- Cada pergunta (front) deve ser clara e específica
- Cada resposta (back) deve ser concisa mas completa
- Priorize: definições, fórmulas, datas importantes, conceitos-chave, relações causa-efeito
- Use linguagem clara e direta
- NÃO inclua informações que não estejam no texto original
- Perguntas devem testar compreensão, não apenas memorização

EXEMPLOS de bons flashcards:
- Front: "O que é velocidade média?" / Back: "É a razão entre o deslocamento total e o intervalo de tempo gasto. Fórmula: v = Δs/Δt"
- Front: "Quando ocorreu a Proclamação da República no Brasil?" / Back: "15 de novembro de 1889"
- Front: "Qual a diferença entre mitose e meiose?" / Back: "Mitose: divisão celular que gera 2 células idênticas. Meiose: gera 4 células com metade dos cromossomos (gametas)."

Use a função generate_flashcards para retornar os flashcards estruturados.`
          },
          {
            role: 'user',
            content: `Analise o seguinte texto e gere flashcards para estudo:\n\n${text}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_flashcards',
              description: 'Gera flashcards estruturados a partir do texto analisado',
              parameters: {
                type: 'object',
                properties: {
                  flashcards: {
                    type: 'array',
                    description: 'Lista de flashcards gerados',
                    items: {
                      type: 'object',
                      properties: {
                        front: {
                          type: 'string',
                          description: 'Pergunta ou conceito (frente do card)'
                        },
                        back: {
                          type: 'string',
                          description: 'Resposta ou explicação (verso do card)'
                        }
                      },
                      required: ['front', 'back']
                    }
                  }
                },
                required: ['flashcards']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_flashcards' } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error('Lovable AI error:', status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas requisições. Aguarde alguns segundos e tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos esgotados. Adicione créditos à sua conta Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract flashcards from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_flashcards') {
      console.error('Invalid tool call response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar flashcards. Tente um texto mais detalhado.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    const flashcards = result.flashcards || [];

    if (flashcards.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível extrair flashcards deste texto. Tente um texto mais detalhado.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${flashcards.length} flashcards`);

    return new Response(
      JSON.stringify({ flashcards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-flashcards:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar flashcards';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
