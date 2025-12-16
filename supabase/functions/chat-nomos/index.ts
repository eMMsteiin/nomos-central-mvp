import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é a Nomos, assistente de rotina para estudantes universitários brasileiros.

PERSONALIDADE:
- Empática e acolhedora
- Realista e prática
- Sem culpa, sem julgamentos
- Usa linguagem natural, informal mas respeitosa
- Evita linguagem técnica excessiva

OBJETIVO:
- Ajudar a organizar o dia de forma sustentável
- Propor ajustes realistas de rotina
- Entender o contexto do aluno antes de sugerir mudanças

REGRAS IMPORTANTES:
1. NUNCA faça mudanças sem propor primeiro e pedir confirmação
2. Sempre entenda o contexto antes de sugerir ações
3. Seja breve nas respostas (máximo 3-4 frases por mensagem)
4. Quando detectar uma intenção de ação, gere uma proposta estruturada

QUANDO GERAR PROPOSTAS:
- "configurar rotina" ou "criar rotina" → action_type: "create_routine_block"
- "ajuste rápido" ou "redistribuir" → action_type: "redistribute_tasks"
- "hoje desandou" ou "não consegui" → action_type: "reschedule_day"
- "modo provas" ou "prova" → action_type: "activate_exam_mode"
- "estudar agora" ou "começar a estudar" → action_type: "start_study_session"

FORMATO DE PROPOSTA (JSON no final da resposta):
Se detectar intenção de ação, termine sua resposta com:
[PROPOSAL]{"action_type": "tipo", "description": "descrição clara", "impact": "impacto esperado", "payload": {}}[/PROPOSAL]`;

interface ChatRequest {
  userId: string;
  conversationId?: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, conversationId, message } = await req.json() as ChatRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create conversation
    let activeConversationId = conversationId;
    let isNewConversation = false;
    
    if (!activeConversationId) {
      // SEMPRE cria nova conversa quando não tem conversationId
      const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({ user_id: userId, status: 'active', title })
        .select('id')
        .single();

      if (convError) throw convError;
      activeConversationId = newConversation.id;
      isNewConversation = true;
    }

    // Get conversation history (last 10 messages for context)
    const { data: history } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Save user message
    await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message
      });

    // Update conversation title if it's the first message and conversation has no title
    if (!conversationId && !isNewConversation) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', activeConversationId)
        .single();
      
      if (conv && !conv.title) {
        const title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', activeConversationId);
      }
    }

    // Build messages array for AI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Por favor, adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let aiContent = aiResponse.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    // Extract proposal if present
    let proposal = null;
    const proposalMatch = aiContent.match(/\[PROPOSAL\](.*?)\[\/PROPOSAL\]/s);
    
    if (proposalMatch) {
      try {
        proposal = JSON.parse(proposalMatch[1]);
        aiContent = aiContent.replace(/\[PROPOSAL\].*?\[\/PROPOSAL\]/s, '').trim();
        
        // Log the proposed action
        await supabase
          .from('chat_actions_log')
          .insert({
            user_id: userId,
            conversation_id: activeConversationId,
            action_type: proposal.action_type,
            payload: proposal.payload || {},
            status: 'proposed'
          });
      } catch (e) {
        console.error("Error parsing proposal:", e);
        proposal = null;
      }
    }

    // Save assistant message
    await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'assistant',
        content: aiContent,
        proposal: proposal
      });

    // Get conversation title to return
    const { data: convData } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', activeConversationId)
      .single();

    return new Response(JSON.stringify({
      conversationId: activeConversationId,
      reply: aiContent,
      proposal,
      title: convData?.title
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
