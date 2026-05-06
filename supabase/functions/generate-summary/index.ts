import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
];

const ESSENTIAL_SYSTEM_PROMPT = `Você é um assistente especializado em criar resumos de estudo concisos e eficazes.

OBJETIVO: Criar um RESUMO ESSENCIAL sobre o tema fornecido.

FORMATO DO RESUMO:
- Use bullets claros e diretos (•)
- 5-10 pontos principais
- Cada ponto deve ser autocontido e compreensível
- Use negrito para termos importantes
- Inclua exemplos práticos quando relevante
- Mantenha linguagem simples e acessível

ESTRUTURA:
## [Título do Tema]

**[Tópico 1]:**
• [Ponto principal]

**[Tópico 2]:**
• [Ponto principal]

**Para lembrar:**
💡 [Uma frase-síntese]

Responda APENAS com o resumo formatado em Markdown, sem explicações adicionais.`;

const EXAM_SYSTEM_PROMPT = `Você é um assistente especializado em criar resumos focados em preparação para provas.

OBJETIVO: Criar um RESUMO PARA PROVA sobre o tema fornecido.

FORMATO DO RESUMO:
- Foque em O QUE CAI NA PROVA
- Inclua comparações e contrastes
- Transforme conceitos em possíveis perguntas de prova
- Use tabelas para comparações quando útil
- Destaque fórmulas, definições e conceitos cobráveis

ESTRUTURA:
## [Tema] - Foco para Prova

**Definições importantes:**
• **[Termo]**: [definição concisa]

**Pontos principais:**
• [Conceito 1 resumido para prova]
• [Conceito 2 resumido para prova]

**Perguntas prováveis na prova:**
❓ [Pergunta] → [Resposta curta]

**Armadilhas comuns:**
⚠️ [Erro comum a evitar]

Responda APENAS com o resumo formatado em Markdown, sem explicações adicionais.`;

async function verifyUser(req: Request): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: 'Authorization header missing', status: 401 };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: 'Unauthorized', status: 401 };
  return { userId: user.id };
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

    const { subject, type, sourceContent, sourceType } = await req.json();

    if (!subject || subject.length < 2) {
      return new Response(JSON.stringify({ error: 'Informe o assunto do resumo.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (subject.length > 200) {
      return new Response(JSON.stringify({ error: 'Assunto muito longo. Máximo 200 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (sourceContent && sourceContent.length > 50000) {
      return new Response(JSON.stringify({ error: 'Conteúdo muito longo. Máximo 50.000 caracteres.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

    const systemPrompt = type === 'exam' ? EXAM_SYSTEM_PROMPT : ESSENTIAL_SYSTEM_PROMPT;

    const userPrompt = sourceContent
      ? `Crie um resumo ${type === 'exam' ? 'para prova' : 'essencial'} sobre "${subject}" baseado no seguinte conteúdo:\n\n${sourceContent}`
      : `Crie um resumo ${type === 'exam' ? 'para prova' : 'essencial'} sobre "${subject}". Use seu conhecimento para criar um resumo útil e didático sobre este tema.`;

    const requestBody = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      safetySettings: SAFETY_SETTINGS,
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let content: string;
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini ${response.status}: ${errText.slice(0, 300)}`);
      }

      const data = await response.json();
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!content) throw new Error('Gemini retornou resposta vazia.');
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }

    const lines = content.split('\n').filter((l: string) => l.trim());
    let title = lines[0]?.replace(/^#+\s*/, '').trim() || `Resumo: ${subject}`;
    if (title.length > 60) title = title.substring(0, 57) + '...';

    return new Response(JSON.stringify({
      title,
      content,
      subject,
      type,
      sourceType: sourceType || 'manual',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-summary] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro ao gerar resumo',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
