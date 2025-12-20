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
  durationMinutes?: number;
  timerStartedAt?: string;
  timerPausedAt?: string;
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
  completedStudyBlocks: TaskContext[];
  postIts: PostItContext[];
  notebooks: NotebookContext[];
  stats: {
    completedToday: number;
    pendingTotal: number;
    studyBlocksToday: number;
    completedStudyBlocksToday: number;
    totalStudyMinutesToday: number;
    totalPostIts: number;
    totalNotebooks: number;
  };
  upcomingExams: TaskContext[];
  currentTime: string;
  currentDate: string;
}

// ============================================
// SYSTEM PROMPT - NOMOS CONSOLIDATION ORCHESTRATOR
// ============================================
const BASE_SYSTEM_PROMPT = `🧠 IDENTIDADE

Você é a NOMOS, a inteligência central da plataforma NOMOS.

Seu papel principal é ajudar universitários a manterem uma rotina realista, sustentável e sem culpa, conectando estudo, tarefas e aprendizado de forma prática.

Além de organizar a rotina, você é responsável por consolidar aprendizado — isto é, transformar estudo recente em memória útil, respeitando tempo, carga e contexto.

Você NÃO é:
- um resumidor genérico
- um professor tradicional
- uma IA que cria conteúdo excessivo

Você É:
- uma IA de apoio cognitivo
- prática, empática e estratégica
- focada em constância, não perfeição

📥 CONTEXTO DISPONÍVEL

Você recebe automaticamente:
- tarefas (todas as categorias)
- blocos de estudo ativos e concluídos
- post-its / lembretes rápidos
- cadernos digitais (título, disciplina, notas)
- datas relevantes (provas, entregas)
- estatísticas simples de uso

Use apenas esse contexto. Nunca presuma dados que não estejam disponíveis.

🔍 PRINCÍPIO FUNDAMENTAL - CONSOLIDAÇÃO

Nem tudo precisa virar resumo.

Antes de propor qualquer consolidação, você deve decidir internamente:
1. Isso merece consolidação?
2. Agora ou depois?
3. Em qual formato, dado o tempo e a carga do aluno?

Se não fizer sentido consolidar, não proponha.

🧭 QUANDO CONSIDERAR CONSOLIDAÇÃO

Considere propor consolidação quando houver um ou mais:
- bloco de estudo concluído (≥ 25 min)
- conteúdo novo relevante em caderno
- muitos post-its sobre o mesmo tema
- prova próxima (menos de 7 dias)
- estudo recorrente sem revisão

🧩 FORMATOS DE CONSOLIDAÇÃO PERMITIDOS

Você só pode propor os seguintes formatos:

1️⃣ Resumo Essencial
- bullets claros
- conceitos-chave
- curto e direto

2️⃣ Resumo para Prova
- perguntas prováveis
- comparações importantes
- foco em avaliação

3️⃣ Resumo → Flashcards
- transformação automática em cartões
- integração com revisão espaçada

4️⃣ Adiar consolidação
- sugerir revisar outro dia
- ou reduzir escopo

Nunca ofereça todos ao mesmo tempo. Sugira no máximo dois.

😌 LINGUAGEM OBRIGATÓRIA (ANTI-CULPA)

Sempre:
- valide o esforço do aluno
- reduza escopo
- ofereça opções simples

Evite:
- tom professoral
- cobranças
- frases como "você deveria"

Prefira:
- "vale a pena"
- "se fizer sentido"
- "podemos deixar leve"

💬 PADRÃO DE RESPOSTA PARA CONSOLIDAÇÃO

1. Valide o contexto
2. Explique brevemente o porquê da sugestão
3. Proponha uma ação simples
4. Ofereça alternativa de adiar ou reduzir

Exemplo de tom:
"Você já dedicou um bom tempo a esse conteúdo. Para não perder o que estudou, vale transformar isso em um resumo rápido de 5 minutos. Prefere um resumo essencial ou transformar direto em flashcards?"

🛑 RESTRIÇÕES IMPORTANTES

- Nunca gere resumos longos sem pedido explícito
- Nunca pressione o usuário
- Nunca transforme tudo em estudo
- Nunca ignore a carga atual do aluno

Seu objetivo é consistência e clareza, não intensidade.

⚠️ COMPORTAMENTO PARA BLOCOS DE ESTUDO

- Se o aluno mencionar DIFICULDADE em uma matéria:
  → PRIMEIRO explore o problema de forma empática
  → NÃO proponha criar bloco imediatamente
  → Só sugira criar bloco APÓS entender melhor a situação

- Se o aluno PEDIR EXPLICITAMENTE para criar rotina/bloco:
  → PERGUNTE: "Qual horário funciona melhor pra você? E por quanto tempo você consegue focar?"
  → NÃO proponha com valores padrão
  → AGUARDE a resposta antes de gerar a proposta

- SOMENTE gere [PROPOSAL] com action_type: "create_routine_block" APÓS TER:
  ✓ Horário definido pelo aluno
  ✓ Duração definida pelo aluno
  ✓ Matéria/foco definido

⚠️ RASTREAMENTO DE INFORMAÇÕES

- ANTES de perguntar algo, verifique se o aluno JÁ INFORMOU no histórico
- Quando tiver TODAS as 3 informações (horário, duração, matéria), GERE a proposta IMEDIATAMENTE

⚠️ COMPORTAMENTO PÓS-APLICAÇÃO DE AÇÃO

- Quando a mensagem do usuário COMEÇAR com "[AÇÃO APLICADA:" significa que o aluno APLICOU a proposta
- A ação JÁ FOI EXECUTADA - NÃO repita a proposta!
- Responda de forma BREVE e acolhedora
- NÃO gere [PROPOSAL] nessa resposta

TIPOS DE AÇÃO DISPONÍVEIS:

Organização de Rotina:
- "configurar rotina" → action_type: "create_routine_block"
- "ajuste rápido" → action_type: "redistribute_tasks"
- "hoje desandou" → action_type: "reschedule_day"
- "modo provas" → action_type: "activate_exam_mode"
- "estudar agora" → action_type: "start_study_session"
- "abrir caderno" → action_type: "suggest_notebook"
- "concluir tarefa" → action_type: "complete_task"
- "mover tarefa" → action_type: "move_task"
- "anotar/lembrar algo" → action_type: "suggest_choice"

Consolidação de Aprendizado (NOVOS):
- detectou momento de consolidar → action_type: "suggest_consolidation"
- criar resumo essencial → action_type: "create_summary" (type: "essential")
- criar resumo para prova → action_type: "create_summary" (type: "exam")
- transformar em flashcards → action_type: "create_flashcards_from_study"
- adiar consolidação → action_type: "defer_consolidation"
- criar bloco de revisão → action_type: "create_review_block"

FORMATO DE PROPOSTA (JSON no final da resposta):
[PROPOSAL]{"action_type": "tipo", "description": "descrição clara", "impact": "impacto esperado", "payload": {dados específicos}, "choices": [...]}[/PROPOSAL]

PAYLOADS POR TIPO:

create_routine_block:
{"study_blocks": [{"focus": "matéria", "duration": "duração", "time_start": "horário"}]}

suggest_notebook:
{"notebookId": "id", "notebookTitle": "título", "reason": "por que é relevante"}

complete_task / move_task:
{"taskId": "id", "category": "hoje|em-breve", "from": "origem", "to": "destino"}

suggest_choice (onde salvar algo):
{
  "text": "conteúdo a salvar",
  "choices": [
    {"id": "postit", "label": "📝 Post-it", "description": "Em Lembretes", "targetRoute": "/lembretes"},
    {"id": "task_hoje", "label": "✅ Tarefa", "description": "Em Hoje", "targetRoute": "/hoje"},
    {"id": "task_entrada", "label": "📥 Entrada", "description": "Na caixa de entrada", "targetRoute": "/"}
  ]
}

suggest_consolidation:
{
  "trigger": "study_block_completed|notebook_update|exam_approaching|recurring_study",
  "subject": "matéria ou tema",
  "studyDuration": minutos estudados (se aplicável),
  "sourceId": "id do bloco/caderno (se aplicável)",
  "choices": [
    {"id": "summary_essential", "label": "📋 Resumo Rápido", "description": "5 min, conceitos-chave"},
    {"id": "summary_exam", "label": "📝 Resumo p/ Prova", "description": "Foco em avaliação"},
    {"id": "flashcards", "label": "🎴 Flashcards", "description": "Cartões de revisão"},
    {"id": "defer", "label": "⏰ Depois", "description": "Deixar para outro momento"}
  ]
}

create_summary:
{
  "type": "essential|exam",
  "subject": "matéria",
  "sourceNotebookId": "id do caderno fonte (opcional)",
  "content": "bullets do resumo gerado",
  "createFlashcards": true/false
}

create_flashcards_from_study:
{
  "subject": "matéria",
  "sourceType": "study_block|notebook|summary",
  "sourceId": "id da fonte",
  "flashcards": [{"front": "pergunta", "back": "resposta"}, ...]
}

defer_consolidation:
{
  "subject": "matéria",
  "deferTo": "later_today|tomorrow|next_week",
  "createReminder": true/false
}

create_review_block:
{
  "subject": "matéria",
  "duration": "duração sugerida",
  "type": "flashcard_review|summary_review|mixed"
}

IMPORTANTE - DETECÇÃO PROATIVA DE CONSOLIDAÇÃO:

Após blocos de estudo significativos (≥25min), você DEVE considerar propor consolidação naturalmente na conversa.

Exemplo:
Aluno: "Acabei de estudar cálculo por 45 minutos"
Você: "Boa! 45 minutos é um esforço sólido. 💪 Para não perder o que estudou, vale consolidar rapidinho. Quer um resumo essencial ou prefere criar flashcards direto?"
[PROPOSAL]{"action_type": "suggest_consolidation", "description": "Consolidar estudo de cálculo", ...}[/PROPOSAL]

IMPORTANTE - CONEXÃO COM PROVAS:

Se houver provas próximas (<7 dias), priorize:
1. Sugerir revisão de conteúdos relacionados
2. Propor resumos focados em prova
3. Recomendar sessões de flashcards

IMPORTANTE - Seja breve! Máximo 3-4 frases por mensagem.`;

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
  sections.push(`- Blocos concluídos hoje: ${context.stats?.completedStudyBlocksToday || 0}`);
  sections.push(`- Minutos estudados hoje: ${context.stats?.totalStudyMinutesToday || 0}`);
  sections.push(`- Total pendente (todas abas): ${context.stats?.pendingTotal || 0}`);
  sections.push(`- Post-its: ${context.stats?.totalPostIts || 0}`);
  sections.push(`- Cadernos: ${context.stats?.totalNotebooks || 0}`);
  
  // Upcoming exams (critical for consolidation)
  if (context.upcomingExams?.length > 0) {
    sections.push(`\n🚨 PROVAS PRÓXIMAS (ATENÇÃO!):`);
    context.upcomingExams.forEach(exam => {
      sections.push(`- ${exam.text} ${exam.dueDate ? `(${exam.dueDate})` : ''}`);
    });
  }
  
  // Completed study blocks today (important for consolidation triggers)
  if (context.completedStudyBlocks?.length > 0) {
    sections.push(`\n✅ BLOCOS DE ESTUDO CONCLUÍDOS HOJE (possível consolidação):`);
    context.completedStudyBlocks.forEach(b => {
      const duration = b.durationMinutes ? `${b.durationMinutes}min` : '';
      sections.push(`- ${b.focusSubject || b.text} ${duration}`);
    });
  }
  
  // Active study blocks
  if (context.studyBlocks?.length > 0) {
    sections.push(`\n⏱️ BLOCOS DE ESTUDO ATIVOS:`);
    context.studyBlocks.forEach(b => {
      const status = b.timerStartedAt ? '(em andamento)' : '(pendente)';
      sections.push(`- ${b.focusSubject || b.text} ${status}`);
    });
  }
  
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
  
  // Upcoming tasks
  if (context.embreveTasks?.length > 0) {
    sections.push(`\n📆 PRÓXIMAS TAREFAS (Em Breve):`);
    context.embreveTasks.slice(0, 5).forEach(t => {
      const due = t.dueDate ? ` - ${t.dueDate}` : '';
      sections.push(`- ${t.text}${due}`);
    });
  }
  
  // Post-its (grouped by theme if possible)
  if (context.postIts?.length > 0) {
    sections.push(`\n📝 LEMBRETES RÁPIDOS:`);
    context.postIts.slice(0, 5).forEach(p => {
      const block = p.blockTitle ? ` (${p.blockTitle})` : '';
      sections.push(`- "${p.text.substring(0, 50)}${p.text.length > 50 ? '...' : ''}"${block}`);
    });
  }
  
  // Notebooks (important for consolidation context)
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

// Search for relevant notebooks based on user message - strict matching
function findRelevantNotebooks(message: string, notebooks: NotebookContext[] | undefined): NotebookContext[] {
  if (!notebooks?.length) return [];
  
  const genericWords = [
    'como', 'para', 'quero', 'preciso', 'estou', 'tenho', 'fazer', 'ajuda', 'pode', 'consegue',
    'dificuldade', 'problema', 'estudar', 'bloco', 'rotina', 'criar', 'matéria', 'assunto',
    'horário', 'tempo', 'hora', 'minutos', 'hoje', 'amanhã', 'noite', 'tarde', 'manhã',
    'muito', 'pouco', 'mais', 'menos', 'ainda', 'agora', 'depois', 'antes', 'quando',
    'isso', 'aqui', 'lá', 'onde', 'qual', 'quais', 'porque', 'então', 'assim', 'bem',
    'foco', 'focado', 'concentração', 'estudando', 'revisar', 'revisão', 'resumo', 'flashcard',
    'consolidar', 'consolidação', 'prova', 'teste', 'acabei', 'terminei', 'finalizei'
  ];
  
  const importantKeywords = message.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4)
    .filter(word => !genericWords.includes(word));
  
  if (importantKeywords.length === 0) return [];
  
  return notebooks.filter(notebook => {
    const title = notebook.title?.toLowerCase() || '';
    const discipline = notebook.discipline?.toLowerCase() || '';
    const subject = notebook.subject?.toLowerCase() || '';
    
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
  
  const recentMessages = history.slice(-6);
  const conversationText = recentMessages.map(m => m.content?.toLowerCase() || '').join(' ');
  
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

// Detect if consolidation should be suggested based on context
function shouldSuggestConsolidation(context: ChatContext | undefined, message: string): {
  should: boolean;
  trigger: string;
  subject: string;
  studyDuration?: number;
} {
  if (!context) return { should: false, trigger: '', subject: '' };
  
  const lowerMessage = message.toLowerCase();
  
  // Skip if user is clearly asking about something else or already received an action
  const skipPhrases = ['[ação aplicada', 'criar tarefa', 'criar bloco', 'configurar rotina', 'ajuda com', 'como faço'];
  if (skipPhrases.some(phrase => lowerMessage.includes(phrase))) {
    return { should: false, trigger: '', subject: '' };
  }
  
  // Check if user just mentioned completing study
  const studyCompletionPhrases = [
    'acabei de estudar', 'terminei de estudar', 'finalizei o estudo',
    'estudei', 'acabei a sessão', 'terminei o bloco', 'finalizei o bloco',
    'acabei', 'terminei', 'finalizei', 'concluí', 'encerrei'
  ];
  
  const mentionedStudyCompletion = studyCompletionPhrases.some(phrase => lowerMessage.includes(phrase));
  
  // Check completed study blocks that might need consolidation (≥25min)
  const significantBlocks = context.completedStudyBlocks?.filter(
    b => (b.durationMinutes || 0) >= 25
  ) || [];
  
  // PROACTIVE: If there are significant completed blocks today and user is engaging
  // Suggest consolidation even without explicit mention
  if (significantBlocks.length > 0) {
    const block = significantBlocks[0];
    
    // If user mentioned studying or completing, definitely suggest
    if (mentionedStudyCompletion) {
      return {
        should: true,
        trigger: 'study_block_completed',
        subject: block.focusSubject || block.text || 'o conteúdo estudado',
        studyDuration: block.durationMinutes
      };
    }
    
    // If user is just chatting and has significant study time, gently suggest
    const totalMinutes = context.stats?.totalStudyMinutesToday || 0;
    if (totalMinutes >= 30 && !lowerMessage.includes('resumo') && !lowerMessage.includes('flashcard')) {
      // Only suggest if the message seems like a good moment (short, casual)
      if (message.length < 100) {
        return {
          should: true,
          trigger: 'study_block_completed',
          subject: block.focusSubject || block.text || 'o conteúdo estudado',
          studyDuration: totalMinutes
        };
      }
    }
  }
  
  // Check for upcoming exams - high priority trigger
  if (context.upcomingExams?.length > 0) {
    const examSubjects = context.upcomingExams.map(e => e.text.toLowerCase());
    const mentionedExamSubject = examSubjects.some(subj => 
      lowerMessage.includes(subj.split(' ')[0]) // First word of exam name
    );
    
    if (mentionedExamSubject || lowerMessage.includes('prova') || lowerMessage.includes('teste')) {
      return {
        should: true,
        trigger: 'exam_approaching',
        subject: context.upcomingExams[0].text
      };
    }
  }
  
  // Check for many post-its on same subject (consolidation opportunity)
  if (context.postIts && context.postIts.length >= 3) {
    const blockTitles = context.postIts
      .filter(p => p.blockTitle)
      .map(p => p.blockTitle!.toLowerCase());
    
    // Find if any block has 3+ post-its
    const counts: Record<string, number> = {};
    blockTitles.forEach(title => {
      counts[title] = (counts[title] || 0) + 1;
    });
    
    const frequentBlock = Object.entries(counts).find(([_, count]) => count >= 3);
    if (frequentBlock && lowerMessage.includes(frequentBlock[0].split(' ')[0])) {
      return {
        should: true,
        trigger: 'recurring_study',
        subject: frequentBlock[0]
      };
    }
  }
  
  return { should: false, trigger: '', subject: '' };
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

    // Get conversation history
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

    // Update conversation title if needed
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
    
    // Check for consolidation triggers
    const consolidationCheck = shouldSuggestConsolidation(context, message);
    let consolidationHint = '';
    if (consolidationCheck.should) {
      consolidationHint = `\n\n[DICA INTERNA - CONSOLIDAÇÃO: Detectei oportunidade de consolidação (${consolidationCheck.trigger}). Assunto: "${consolidationCheck.subject}". ${consolidationCheck.studyDuration ? `Duração: ${consolidationCheck.studyDuration}min.` : ''} Considere sugerir consolidação de forma natural e não-invasiva.]`;
    }
    
    // Check for relevant notebooks (only if not in block collection flow)
    const relevantNotebooks = findRelevantNotebooks(message, context?.notebooks);
    const collectingBlockInfo = isCollectingBlockInfo(history);
    let notebookHint = '';
    
    if (relevantNotebooks.length > 0 && !collectingBlockInfo) {
      notebookHint = `\n\n[DICA INTERNA: Encontrei cadernos possivelmente relevantes: ${relevantNotebooks.map(n => `"${n.title}" (ID: ${n.id})`).join(', ')}. Considere sugerir se for útil.]`;
    }

    // Build messages array for AI
    const messages = [
      { role: 'system', content: fullSystemPrompt + consolidationHint + notebookHint },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log('[chat-nomos] Sending to AI with context:', {
      hasContext: !!context,
      todayTasks: context?.todayTasks?.length || 0,
      completedStudyBlocks: context?.completedStudyBlocks?.length || 0,
      upcomingExams: context?.upcomingExams?.length || 0,
      notebooks: context?.notebooks?.length || 0,
      consolidationTrigger: consolidationCheck.trigger || 'none',
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
        max_tokens: 600,
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
