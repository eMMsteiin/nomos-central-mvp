import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMPLATE_PROMPTS = {
  topics: `Gere um resumo estruturado em formato de TÓPICOS PRINCIPAIS. Use:
- Títulos claros para cada seção
- Bullet points para sub-tópicos
- Negrito para conceitos-chave
- Exemplos práticos quando relevante`,
  
  cornell: `Gere um resumo no MÉTODO CORNELL com três seções:
## 📝 Notas Principais
(Conteúdo detalhado do tema)

## ❓ Perguntas-Chave
(5-7 perguntas que testam a compreensão)

## 📌 Resumo Final
(Síntese em 3-5 frases)`,
  
  conceptual: `Gere um MAPA CONCEITUAL em texto, mostrando:
- Conceito central em destaque
- Conceitos relacionados organizados hierarquicamente
- Conexões entre conceitos (use → para indicar relações)
- Exemplos para cada conceito principal`,
};

const DIFFICULTY_INSTRUCTIONS = {
  basic: 'Use linguagem simples e foque nos conceitos fundamentais. Evite jargões técnicos.',
  intermediate: 'Inclua detalhes importantes e algumas nuances. Balance simplicidade com profundidade.',
  advanced: 'Inclua detalhes técnicos, exceções, casos especiais e conexões com outros tópicos.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, content, topic, template, difficulty, discipline } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    let userPrompt = '';
    
    if (mode === 'text') {
      userPrompt = `Analise o seguinte texto e gere um resumo completo:

---
${content}
---

${TEMPLATE_PROMPTS[template as keyof typeof TEMPLATE_PROMPTS]}`;
    } else {
      userPrompt = `Gere um resumo completo sobre o tópico: "${topic}"
${discipline ? `Disciplina: ${discipline}` : ''}

${TEMPLATE_PROMPTS[template as keyof typeof TEMPLATE_PROMPTS]}`;
    }

    const systemPrompt = `Você é um assistente especializado em criar resumos educacionais para estudantes universitários brasileiros.

INSTRUÇÕES:
- ${DIFFICULTY_INSTRUCTIONS[difficulty as keyof typeof DIFFICULTY_INSTRUCTIONS]}
- Use Markdown para formatação (títulos ##, negrito **, listas -)
- Seja conciso mas completo
- Inclua exemplos práticos quando apropriado
- Use emojis moderadamente para destacar seções
- Gere um título apropriado no início (# Título)`;

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
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_summary',
              description: 'Gera um resumo estruturado',
              parameters: {
                type: 'object',
                properties: {
                  title: { 
                    type: 'string', 
                    description: 'Título do resumo (sem # ou emoji)' 
                  },
                  content: { 
                    type: 'string', 
                    description: 'Conteúdo completo do resumo em Markdown' 
                  },
                  tags: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: '3-5 tags relevantes para busca' 
                  },
                },
                required: ['title', 'content', 'tags'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_summary' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('Erro ao gerar resumo');
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('Resposta inválida da IA');
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
