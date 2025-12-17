import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEMPLATE_PROMPTS = {
  topics: `Gere um resumo estruturado em formato de TÓPICOS PRINCIPAIS usando Markdown:

## 📋 Visão Geral
(Introdução breve ao tema em 2-3 frases)

## 🎯 Conceitos Principais
- **Conceito 1**: Explicação clara
- **Conceito 2**: Explicação clara
- **Conceito 3**: Explicação clara

## 📝 Detalhes Importantes
### Tópico 1
- Ponto importante
- Exemplo prático

### Tópico 2
- Ponto importante
- Exemplo prático

## 💡 Dicas para Lembrar
- Dica 1
- Dica 2

## ✅ Resumo Rápido
(3-5 bullet points com os pontos-chave)`,
  
  cornell: `Gere um resumo no MÉTODO CORNELL com EXATAMENTE estas três seções separadas:

## 📝 Notas Principais
(Conteúdo detalhado e organizado do tema)
- Use bullet points para organizar ideias
- Inclua definições importantes em **negrito**
- Adicione exemplos práticos
- Organize por sub-tópicos se necessário

## ❓ Perguntas-Chave
(5-7 perguntas que testam a compreensão do conteúdo)
1. Pergunta sobre conceito fundamental?
2. Pergunta sobre aplicação prática?
3. Pergunta sobre relações entre conceitos?
4. Pergunta de análise crítica?
5. Pergunta de síntese?

## 📌 Resumo Final
(Síntese concisa em 3-5 frases capturando a essência do tema. Deve ser possível entender o tema principal apenas lendo esta seção.)`,
  
  conceptual: `Gere um MAPA CONCEITUAL estruturado usando EXATAMENTE este formato:

## 🎯 Conceito Central
**[Nome do conceito principal]**
(Uma frase definindo o conceito central)

### Ramo 1: [Nome da Categoria]
- **Conceito**: Descrição breve
  → Subconceito 1: detalhes específicos
  → Subconceito 2: detalhes específicos

### Ramo 2: [Nome da Categoria]
- **Conceito**: Descrição breve
  → Subconceito 1: detalhes específicos
  → Subconceito 2: detalhes específicos

### Ramo 3: [Nome da Categoria]
- **Conceito**: Descrição breve
  → Subconceito 1: detalhes específicos

## 🔗 Conexões Importantes
- **[Conceito A]** ←→ **[Conceito B]**: explicação da relação bidirecional
- **[Conceito C]** → **[Conceito D]**: explicação da relação de causa-efeito
- **[Conceito E]** ⊂ **[Conceito F]**: explicação da relação de inclusão

## 💡 Exemplos Práticos
1. **Exemplo 1**: Descrição que conecta os conceitos
2. **Exemplo 2**: Aplicação real dos conceitos
3. **Exemplo 3**: Caso de uso prático`,
};

const DIFFICULTY_INSTRUCTIONS = {
  basic: 'Use linguagem simples e acessível. Foque nos conceitos fundamentais sem jargões técnicos. Ideal para primeiro contato com o tema.',
  intermediate: 'Inclua detalhes importantes e nuances. Balance simplicidade com profundidade técnica. Mencione exceções relevantes.',
  advanced: 'Inclua detalhes técnicos avançados, exceções, casos especiais, debates acadêmicos e conexões interdisciplinares.',
};

// Parse direct markdown response when tool calling fails
function parseMarkdownResponse(text: string): { title: string; content: string; tags: string[] } {
  // Extract title from first # heading or first line
  const titleMatch = text.match(/^#\s*(.+)$/m);
  const title = titleMatch 
    ? titleMatch[1].replace(/[#*_]/g, '').trim()
    : text.split('\n')[0].substring(0, 60).replace(/[#*_]/g, '').trim();

  // Remove the title line from content
  const content = titleMatch 
    ? text.replace(titleMatch[0], '').trim()
    : text;

  // Extract tags from bold words or key terms
  const boldWords = text.match(/\*\*([^*]+)\*\*/g) || [];
  const tags = boldWords
    .slice(0, 5)
    .map(w => w.replace(/\*\*/g, '').toLowerCase().trim())
    .filter(w => w.length > 2 && w.length < 30);

  // If no bold words, extract from headings
  if (tags.length === 0) {
    const headings = text.match(/^##\s*(.+)$/gm) || [];
    headings.slice(0, 5).forEach(h => {
      const cleaned = h.replace(/^##\s*/, '').replace(/[📝❓📌🎯💡🔗📋✅]/g, '').toLowerCase().trim();
      if (cleaned.length > 2 && cleaned.length < 30) {
        tags.push(cleaned);
      }
    });
  }

  return { title: title || 'Resumo', content, tags };
}

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

    const templateName = {
      topics: 'Tópicos Principais',
      cornell: 'Método Cornell',
      conceptual: 'Mapa Conceitual',
    }[template as string] || 'Tópicos';

    let userPrompt = '';
    
    if (mode === 'text') {
      userPrompt = `Analise o seguinte texto e gere um resumo completo no formato "${templateName}":

---
${content}
---

${TEMPLATE_PROMPTS[template as keyof typeof TEMPLATE_PROMPTS]}`;
    } else {
      userPrompt = `Gere um resumo completo sobre o tópico: "${topic}"
${discipline ? `Disciplina: ${discipline}` : ''}
Formato: ${templateName}

${TEMPLATE_PROMPTS[template as keyof typeof TEMPLATE_PROMPTS]}`;
    }

    const systemPrompt = `Você é um assistente especializado em criar resumos educacionais para estudantes universitários brasileiros.

INSTRUÇÕES OBRIGATÓRIAS:
- ${DIFFICULTY_INSTRUCTIONS[difficulty as keyof typeof DIFFICULTY_INSTRUCTIONS]}
- SIGA EXATAMENTE a estrutura do template solicitado
- Use Markdown para formatação (títulos ##, negrito **, listas -, setas →)
- Seja conciso mas completo
- Inclua exemplos práticos e aplicações reais
- Use emojis APENAS nos cabeçalhos das seções conforme indicado no template
- Gere um título claro e descritivo (sem # ou emoji)
- Gere 3-5 tags relevantes para busca

IMPORTANTE: O conteúdo deve seguir FIELMENTE a estrutura do template pedido. Não misture formatos.`;

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
              description: 'Gera um resumo estruturado seguindo o template especificado',
              parameters: {
                type: 'object',
                properties: {
                  title: { 
                    type: 'string', 
                    description: 'Título descritivo do resumo (sem # ou emoji, max 60 caracteres)' 
                  },
                  content: { 
                    type: 'string', 
                    description: 'Conteúdo completo do resumo em Markdown, seguindo EXATAMENTE a estrutura do template solicitado' 
                  },
                  tags: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: '3-5 tags relevantes para busca (palavras-chave do conteúdo)' 
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
    
    // Log response structure for debugging
    console.log('AI Response structure:', {
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
      hasContent: !!data.choices?.[0]?.message?.content,
      finishReason: data.choices?.[0]?.finish_reason
    });

    // Try tool calling first (preferred)
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        console.log('Tool call parsed successfully:', { title: result.title, contentLength: result.content?.length });
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (parseError) {
        console.error('Error parsing tool call arguments:', parseError);
      }
    }

    // Fallback: extract from direct text content
    const textContent = data.choices?.[0]?.message?.content;
    if (textContent) {
      console.log('Using fallback: parsing direct text response');
      const result = parseMarkdownResponse(textContent);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Resposta inválida da IA - nenhum conteúdo encontrado');
  } catch (error) {
    console.error('Error in generate-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
