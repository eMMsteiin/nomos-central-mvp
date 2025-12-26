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
    const { annotationText } = await req.json();
    
    if (!annotationText || annotationText.trim().length === 0) {
      return new Response(JSON.stringify({ title: 'Nova tarefa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      const fallback = annotationText.split('\n')[0].slice(0, 40);
      return new Response(JSON.stringify({ title: fallback || 'Nova tarefa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Generating smart title for annotation:", annotationText.slice(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um assistente que gera títulos CURTOS e CLAROS para tarefas.

REGRAS IMPORTANTES:
- Máximo de 6 palavras
- Comece com verbo de ação quando fizer sentido (Estudar, Revisar, Preparar, Comprar, etc.)
- Seja direto e objetivo
- Capture a essência/ação principal do texto
- NÃO use pontuação final
- NÃO inclua datas ou horários no título
- Responda APENAS com o título, nada mais

EXEMPLOS:
Texto: "Preciso pensar em novas cores para pintar a casa, talvez azul ou verde claro"
Título: Escolher cores para pintar casa

Texto: "Revisar capítulo 5 de cálculo sobre derivadas parciais antes da prova"
Título: Revisar derivadas parciais

Texto: "Lembrar de comprar material de escritório: canetas, post-its e grampeador"
Título: Comprar material de escritório

Texto: "Ideias para o projeto de TCC: machine learning aplicado em saúde"
Título: Desenvolver projeto TCC`
          },
          {
            role: "user",
            content: `Gere um título curto para esta anotação:\n\n${annotationText.slice(0, 500)}`
          }
        ],
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      const fallback = annotationText.split('\n')[0].slice(0, 40);
      return new Response(JSON.stringify({ title: fallback || 'Nova tarefa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Limpar e validar título
    title = title.replace(/^["']|["']$/g, '').trim();
    title = title.replace(/\.$/g, '');
    
    if (!title || title.length > 60) {
      title = annotationText.split('\n')[0].slice(0, 40);
    }

    console.log("Generated title:", title);

    return new Response(JSON.stringify({ title: title || 'Nova tarefa' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating title:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ title: 'Nova tarefa', error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
