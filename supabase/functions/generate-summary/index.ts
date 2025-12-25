import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ESSENTIAL_SYSTEM_PROMPT = `Você é um assistente especializado em criar resumos de estudo concisos e eficazes.

OBJETIVO: Criar um RESUMO ESSENCIAL que capture os conceitos-chave de forma clara e memorável.

FORMATO DO RESUMO:
- Use bullets claros e diretos (•)
- Máximo 5-7 pontos principais
- Cada ponto deve ser autocontido e compreensível
- Use negrito para termos importantes
- Inclua exemplos práticos quando útil
- Mantenha linguagem simples e acessível

ESTRUTURA:
## [Título do Tema]

**Conceitos-chave:**
• [Ponto 1 - conceito principal]
• [Ponto 2 - conceito secundário]
...

**Para lembrar:**
💡 [Uma frase-síntese que conecta tudo]

Responda APENAS com o resumo formatado em Markdown, sem explicações adicionais.`;

const EXAM_SYSTEM_PROMPT = `Você é um assistente especializado em criar resumos focados em preparação para provas.

OBJETIVO: Criar um RESUMO PARA PROVA que prepare o estudante para avaliações.

FORMATO DO RESUMO:
- Foque em O QUE CAI NA PROVA
- Inclua comparações e contrastes (muito cobrados em provas)
- Antecipe perguntas prováveis
- Use tabelas para comparações quando útil
- Destaque fórmulas, definições e conceitos cobráveis

ESTRUTURA:
## [Tema] - Foco para Prova

**Definições importantes:**
• **[Termo]**: [definição concisa]
...

**Comparações frequentes:**
| Aspecto | Conceito A | Conceito B |
|---------|-----------|-----------|
...

**Perguntas prováveis:**
❓ [Pergunta 1] → [Resposta curta]
❓ [Pergunta 2] → [Resposta curta]

**Armadilhas comuns:**
⚠️ [Erro comum que estudantes cometem]

Responda APENAS com o resumo formatado em Markdown, sem explicações adicionais.`;

// Helper function to verify user authentication
async function verifyUser(req: Request): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { error: 'Authorization header missing', status: 401 };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  // Create client with user's auth token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    console.error('[generate-summary] Auth error:', error);
    return { error: 'Unauthorized', status: 401 };
  }

  return { userId: user.id };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authResult = await verifyUser(req);
    if ('error' in authResult) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[generate-summary] Authenticated user:', authResult.userId);

    const { subject, type, sourceContent, sourceType } = await req.json();
    
    // Input validation
    if (!subject || subject.length < 2) {
      return new Response(JSON.stringify({ error: 'Subject is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (subject.length > 200) {
      return new Response(JSON.stringify({ error: 'Subject too long. Limit: 200 characters.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (sourceContent && sourceContent.length > 50000) {
      return new Response(JSON.stringify({ error: 'Source content too long. Limit: 50,000 characters.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[generate-summary] Received request:', { subject, type, sourceType, contentLength: sourceContent?.length });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = type === 'exam' ? EXAM_SYSTEM_PROMPT : ESSENTIAL_SYSTEM_PROMPT;
    
    const userPrompt = sourceContent 
      ? `Crie um resumo ${type === 'exam' ? 'para prova' : 'essencial'} sobre "${subject}" baseado no seguinte conteúdo de estudo:\n\n${sourceContent}`
      : `Crie um resumo ${type === 'exam' ? 'para prova' : 'essencial'} sobre "${subject}". Use seu conhecimento para criar um resumo útil sobre este tema.`;

    console.log('[generate-summary] Calling Lovable AI...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error('[generate-summary] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    console.log('[generate-summary] Generated content length:', content.length);

    // Generate a title from the content (first line without # or first 50 chars)
    const lines = content.split('\n').filter((l: string) => l.trim());
    let title = lines[0]?.replace(/^#+\s*/, '').trim() || `Resumo: ${subject}`;
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    const result = {
      title,
      content,
      subject,
      type,
      sourceType: sourceType || 'chat',
    };

    console.log('[generate-summary] Success:', { title, subject, type });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[generate-summary] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
