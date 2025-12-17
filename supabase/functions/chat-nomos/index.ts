import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Context types from frontend
interface TaskContext {
  id: string;
  text: string;
  priority?: string;
  completed?: boolean;
  dueDate?: string;
  type?: string;
  focusSubject?: string;
}

interface PostItContext {
  id: string;
  text: string;
  blockTitle?: string;
}

interface NotebookContext {
  id: string;
  title: string;
  discipline?: string;
  subject?: string;
  textNotes?: string;
  updatedAt: string;
  pageCount: number;
}

interface ChatContext {
  todayTasks: TaskContext[];
  entradaTasks: TaskContext[];
  embreveTasks: TaskContext[];
  completedTasks: TaskContext[];
  studyBlocks: TaskContext[];
  postIts: PostItContext[];
  notebooks: NotebookContext[];
  stats: {
    completedToday: number;
    pendingTotal: number;
    studyBlocksToday: number;
    totalPostIts: number;
    totalNotebooks: number;
  };
  currentTime: string;
  currentDate: string;
}

const BASE_SYSTEM_PROMPT = `Você é a Nomos, assistente de rotina para estudantes universitários brasileiros.

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
- Conectar informações entre diferentes partes do app (tarefas, cadernos, lembretes)

REGRAS IMPORTANTES:
1. NUNCA faça mudanças sem propor primeiro e pedir confirmação
2. Sempre entenda o contexto antes de sugerir ações
3. Seja breve nas respostas (máximo 3-4 frases por mensagem)
4. Quando detectar uma intenção de ação, gere uma proposta estruturada
5. Se o aluno mencionar uma matéria ou conceito, busque nos cadernos se há notas relevantes
6. Quando o aluno quiser anotar, lembrar ou criar algo sem especificar onde, use suggest_choice para perguntar onde salvar

⚠️ COMPORTAMENTO PARA BLOCOS DE ESTUDO (MUITO IMPORTANTE):
- Se o aluno mencionar DIFICULDADE em uma matéria ("tenho dificuldade em X", "não consigo estudar Y"):
  → PRIMEIRO explore o problema de forma empática: "O que tá sendo mais difícil? É falta de tempo ou a matéria em si?"
  → NÃO proponha criar bloco imediatamente
  → Só sugira criar bloco APÓS entender melhor a situação

- Se o aluno PEDIR EXPLICITAMENTE para criar rotina/bloco ("quero criar um bloco", "configura minha rotina"):
  → PERGUNTE: "Qual horário funciona melhor pra você? E por quanto tempo você consegue focar?"
  → NÃO proponha com valores padrão
  → AGUARDE a resposta antes de gerar a proposta

- SOMENTE gere [PROPOSAL] com action_type: "create_routine_block" APÓS TER:
  ✓ Horário definido pelo aluno (ex: "20h", "de noite", "depois do almoço")
  ✓ Duração definida pelo aluno (ex: "1 hora", "45 min", "meia hora")
  ✓ Matéria/foco definido
  
- Se o aluno NÃO informou horário E duração, NÃO gere a proposta ainda - pergunte primeiro!

⚠️ REGRA DE FOCO (CRÍTICO):
- Se você está COLETANDO INFORMAÇÕES para criar um bloco de estudo (perguntou horário ou duração):
  → NÃO mude de assunto
  → NÃO sugira abrir cadernos
  → NÃO faça outras propostas
  → MANTENHA O FOCO até completar a coleta

⚠️ RASTREAMENTO DE INFORMAÇÕES (LEIA O HISTÓRICO):
- ANTES de perguntar algo, verifique se o aluno JÁ INFORMOU no histórico:
  → Se já disse horário (ex: "15h", "de tarde", "à noite") → NÃO pergunte de novo
  → Se já disse duração (ex: "1h", "3 horas", "30 min") → NÃO pergunte de novo
  → Se já disse matéria (ex: "Álgebra Linear") → NÃO pergunte de novo
- Quando tiver TODAS as 3 informações, GERE a proposta IMEDIATAMENTE

⚠️ SUGESTÃO DE CADERNOS (SEJA RIGOROSO):
- SOMENTE sugira cadernos se o conteúdo for MUITO relevante (mesmo assunto/matéria)
- "Álgebra Linear" ≠ "Bhaskara" - são matérias diferentes, NÃO relacione!
- Prefira NÃO sugerir se não tiver CERTEZA da relevância
- NUNCA sugira cadernos no meio de um fluxo de coleta de dados para bloco de estudo

⚠️ COMPORTAMENTO PÓS-APLICAÇÃO DE AÇÃO (MUITO IMPORTANTE):
- Quando a mensagem do usuário COMEÇAR com "[AÇÃO APLICADA:" significa que o aluno APLICOU a proposta com sucesso
- A ação JÁ FOI EXECUTADA no sistema - NÃO repita a proposta!
- NÃO proponha a mesma ação novamente
- Responda de forma BREVE e acolhedora, perguntando se há algo mais:
  → "Pronto! 🎉 Bloco criado. Tem mais alguma coisa que posso ajudar?"
  → "Feito! Quer ajustar mais alguma coisa na sua rotina?"
  → "Perfeito! Posso te ajudar com mais alguma coisa hoje?"
  → "Boa! Tá precisando de mais alguma coisa?"
- NÃO gere [PROPOSAL] nessa resposta (a ação já foi aplicada)

TIPOS DE AÇÃO DISPONÍVEIS:
- "configurar rotina" ou "criar rotina" ou "bloco de estudo" → PERGUNTE horário e duração primeiro, depois use action_type: "create_routine_block"
- "ajuste rápido" ou "redistribuir" → action_type: "redistribute_tasks"
- "hoje desandou" ou "não consegui" → action_type: "reschedule_day"
- "modo provas" ou "prova" → action_type: "activate_exam_mode"
- "estudar agora" ou "começar a estudar" → action_type: "start_study_session"
- "abrir caderno" ou quando mencionar matéria com caderno relevante → action_type: "suggest_notebook"
- "concluir" ou "marcar como feito" → action_type: "complete_task"
- "mover tarefa" ou "adiar" → action_type: "move_task"
- "anotar" ou "lembrar" ou "não esquecer" ou "preciso fazer" (SEM especificar onde) → action_type: "suggest_choice"

FORMATO DE PROPOSTA (JSON no final da resposta):
Se detectar intenção de ação E tiver todas informações necessárias, termine sua resposta com:
[PROPOSAL]{"action_type": "tipo", "description": "descrição clara", "impact": "impacto esperado", "payload": {dados específicos}, "choices": [...]}[/PROPOSAL]

PAYLOADS POR TIPO:
- create_routine_block: {"study_blocks": [{"focus": "matéria informada pelo aluno", "duration": "duração informada pelo aluno", "time_start": "horário informado pelo aluno"}]}
  IMPORTANTE: só use após coletar horário e duração do aluno!
- suggest_notebook: {"notebookId": "id", "notebookTitle": "título", "reason": "por que é relevante"}
- complete_task: {"taskId": "id", "category": "hoje|em-breve"}
- move_task: {"taskId": "id", "from": "hoje", "to": "em-breve"}

IMPORTANTE - PARA suggest_choice (quando o aluno quer criar/anotar algo):
Use este formato com choices para perguntar onde salvar:
{
  "action_type": "suggest_choice",
  "description": "Entendi! Onde você quer salvar isso?",
  "impact": "",
  "payload": {"text": "o conteúdo que o aluno quer salvar"},
  "choices": [
    {"id": "postit", "label": "📝 Criar Post-it", "description": "Em Lembretes Rápidos", "targetRoute": "/lembretes", "queryParams": {"newPostIt": "true", "text": "conteúdo"}},
    {"id": "task_hoje", "label": "✅ Criar Tarefa", "description": "Em Hoje", "targetRoute": "/hoje", "queryParams": {"newTask": "true", "text": "conteúdo"}},
    {"id": "task_entrada", "label": "📥 Criar na Entrada", "description": "Na caixa de entrada", "targetRoute": "/", "queryParams": {"newTask": "true", "text": "conteúdo"}}
  ]
}`;

function buildContextPrompt(context: ChatContext | undefined): string {
  if (!context) return '';
  
  const sections: string[] = ['\n\n--- CONTEXTO ATUAL DO ALUNO ---'];
  
  // Current time
  sections.push(`📅 ${context.currentDate} - ${context.currentTime}`);
  
  // Stats summary
  sections.push(`\n📊 RESUMO:`);
  sections.push(`- Tarefas pendentes hoje: ${context.todayTasks?.length || 0}`);
  sections.push(`- Concluídas hoje: ${context.stats?.completedToday || 0}`);
  sections.push(`- Blocos de estudo ativos: ${context.stats?.studyBlocksToday || 0}`);
  sections.push(`- Total pendente (todas abas): ${context.stats?.pendingTotal || 0}`);
  sections.push(`- Post-its: ${context.stats?.totalPostIts || 0}`);
  sections.push(`- Cadernos: ${context.stats?.totalNotebooks || 0}`);
  
  // Today's tasks
  if (context.todayTasks?.length > 0) {
    sections.push(`\n📋 TAREFAS DE HOJE:`);
    context.todayTasks.slice(0, 10).forEach(t => {
      const priority = t.priority ? ` [${t.priority}]` : '';
      sections.push(`- ${t.text}${priority}`);
    });
    if (context.todayTasks.length > 10) {
      sections.push(`... e mais ${context.todayTasks.length - 10} tarefas`);
    }
  }
  
  // Study blocks
  if (context.studyBlocks?.length > 0) {
    sections.push(`\n⏱️ BLOCOS DE ESTUDO HOJE:`);
    context.studyBlocks.forEach(b => {
      sections.push(`- ${b.focusSubject || b.text}`);
    });
  }
  
  // Upcoming tasks
  if (context.embreveTasks?.length > 0) {
    sections.push(`\n📆 PRÓXIMAS TAREFAS (Em Breve):`);
    context.embreveTasks.slice(0, 5).forEach(t => {
      const due = t.dueDate ? ` - ${t.dueDate}` : '';
      sections.push(`- ${t.text}${due}`);
    });
  }
  
  // Post-its
  if (context.postIts?.length > 0) {
    sections.push(`\n📝 LEMBRETES RÁPIDOS:`);
    context.postIts.slice(0, 5).forEach(p => {
      sections.push(`- "${p.text.substring(0, 50)}${p.text.length > 50 ? '...' : ''}"`);
    });
  }
  
  // Notebooks (with textNotes for AI search)
  if (context.notebooks?.length > 0) {
    sections.push(`\n📓 CADERNOS DIGITAIS:`);
    context.notebooks.forEach(n => {
      const info = [n.title];
      if (n.discipline) info.push(`(${n.discipline})`);
      if (n.textNotes) {
        info.push(`- Notas: "${n.textNotes.substring(0, 100)}${n.textNotes.length > 100 ? '...' : ''}"`);
      }
      sections.push(`- ${info.join(' ')}`);
    });
  }
  
  // Recently completed (for context)
  if (context.completedTasks?.length > 0) {
    sections.push(`\n✅ RECENTEMENTE CONCLUÍDAS:`);
    context.completedTasks.slice(0, 3).forEach(t => {
      sections.push(`- ${t.text}`);
    });
  }
  
  sections.push('\n--- FIM DO CONTEXTO ---\n');
  
  return sections.join('\n');
}

// Search for relevant notebooks based on user message - MORE STRICT matching
function findRelevantNotebooks(message: string, notebooks: NotebookContext[] | undefined): NotebookContext[] {
  if (!notebooks?.length) return [];
  
  // Palavras genéricas que não indicam matéria específica
  const genericWords = [
    'como', 'para', 'quero', 'preciso', 'estou', 'tenho', 'fazer', 'ajuda', 'pode', 'consegue',
    'dificuldade', 'problema', 'estudar', 'bloco', 'rotina', 'criar', 'matéria', 'assunto',
    'horário', 'tempo', 'hora', 'minutos', 'hoje', 'amanhã', 'noite', 'tarde', 'manhã',
    'muito', 'pouco', 'mais', 'menos', 'ainda', 'agora', 'depois', 'antes', 'quando',
    'isso', 'aqui', 'lá', 'onde', 'qual', 'quais', 'porque', 'então', 'assim', 'bem',
    'foco', 'focado', 'concentração', 'estudando', 'revisar', 'revisão'
  ];
  
  // Extrai palavras importantes (maiores que 4 chars e não genéricas)
  const importantKeywords = message.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4)
    .filter(word => !genericWords.includes(word));
  
  // Se não sobrou nenhuma palavra importante, não sugere cadernos
  if (importantKeywords.length === 0) return [];
  
  return notebooks.filter(notebook => {
    const title = notebook.title?.toLowerCase() || '';
    const discipline = notebook.discipline?.toLowerCase() || '';
    const subject = notebook.subject?.toLowerCase() || '';
    
    // Correspondência mais rigorosa: título, disciplina ou subject deve conter a palavra-chave
    // NÃO busca em textNotes para evitar falsos positivos
    return importantKeywords.some(keyword => 
      title.includes(keyword) || 
      discipline.includes(keyword) || 
      subject.includes(keyword)
    );
  });
}

// Check if AI is currently collecting info for a study block
function isCollectingBlockInfo(history: Array<{role: string, content: string}> | null): boolean {
  if (!history || history.length < 2) return false;
  
  // Check last 6 messages for block creation flow
  const recentMessages = history.slice(-6);
  const conversationText = recentMessages.map(m => m.content?.toLowerCase() || '').join(' ');
  
  // Indicators that we're in block creation flow
  const blockFlowIndicators = [
    'bloco de estudo',
    'qual horário',
    'quanto tempo',
    'por quanto tempo',
    'que horas',
    'configurar rotina',
    'criar rotina',
    'criar bloco'
  ];
  
  return blockFlowIndicators.some(indicator => conversationText.includes(indicator));
}

interface ChatRequest {
  userId: string;
  conversationId?: string;
  message: string;
  context?: ChatContext;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, conversationId, message, context } = await req.json() as ChatRequest;
    
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

    // Build dynamic system prompt with context
    const contextPrompt = buildContextPrompt(context);
    const fullSystemPrompt = BASE_SYSTEM_PROMPT + contextPrompt;
    
    // Check for relevant notebooks to potentially suggest
    // BUT NOT if we're in a block creation flow (to maintain focus)
    const relevantNotebooks = findRelevantNotebooks(message, context?.notebooks);
    const collectingBlockInfo = isCollectingBlockInfo(history);
    let notebookHint = '';
    
    // Only inject notebook hint if NOT in block collection flow
    if (relevantNotebooks.length > 0 && !collectingBlockInfo) {
      notebookHint = `\n\n[DICA INTERNA: Encontrei cadernos possivelmente relevantes para esta conversa: ${relevantNotebooks.map(n => `"${n.title}" (ID: ${n.id})`).join(', ')}. Considere sugerir ao aluno se for útil, mas SOMENTE se for realmente relevante para a matéria específica mencionada.]`;
    }

    // Build messages array for AI
    const messages = [
      { role: 'system', content: fullSystemPrompt + notebookHint },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log('[chat-nomos] Sending to AI with context:', {
      hasContext: !!context,
      todayTasks: context?.todayTasks?.length || 0,
      notebooks: context?.notebooks?.length || 0,
      relevantNotebooks: relevantNotebooks.length,
      collectingBlockInfo,
    });

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
          
        console.log('[chat-nomos] Proposal created:', proposal.action_type);
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
