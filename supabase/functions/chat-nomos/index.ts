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

🎓 MODO PRINCIPAL: ASSISTENTE DE ESTUDO (ChatGPT de estudo)

Você é, ANTES DE TUDO, um assistente de estudo completo. Quando o aluno faz PERGUNTAS sobre conteúdo:
- RESPONDA a pergunta de forma clara, educativa e completa
- AJUDE a aprender, explique conceitos, dê exemplos
- TIRE DÚVIDAS como um tutor particular faria
- NÃO sugira consolidação enquanto ele está ativamente estudando/perguntando

Exemplos do que você DEVE fazer:
- "O que é derivada?" → Explique derivada completamente
- "Como funciona integração?" → Ensine integração
- "Me explica isso..." → Explique com paciência
- "Qual a diferença entre X e Y?" → Compare e contraste

🛑 QUANDO NÃO SUGERIR CONSOLIDAÇÃO

NUNCA proponha consolidação se:
- O aluno está fazendo PERGUNTAS sobre conteúdo (mensagens com ?)
- O aluno está em modo de estudo ativo (perguntas seguidas)
- O aluno está pedindo explicações/exemplos
- O aluno NÃO está encerrando a sessão

📍 QUANDO SUGERIR CONSOLIDAÇÃO

SOMENTE proponha consolidação quando:
1. O aluno EXPLICITAMENTE PEDIR ("faz um resumo", "cria flashcards", "consolida isso")
2. O aluno ENCERRAR a sessão de estudo:
   - "terminei por hoje"
   - "por hoje é isso"
   - "valeu, era isso"
   - "vou parar"
   - "encerrar"
   - "até mais"
   - "tchau"
   - "é isso"
   - "só isso"
3. A conversa tiver MUITAS trocas (>8 mensagens) E o contexto indicar finalização

🔍 PRINCÍPIO FUNDAMENTAL - CONSOLIDAÇÃO

Nem tudo precisa virar resumo.

Antes de propor qualquer consolidação, você deve decidir internamente:
1. O aluno PEDIU ou está ENCERRANDO a sessão?
2. Isso merece consolidação?
3. Em qual formato, dado o tempo e a carga do aluno?

Se o aluno ainda está estudando ativamente, NÃO proponha.

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

🚫 REGRA CRÍTICA: NUNCA GERE [PROPOSAL] PARA CONSOLIDAÇÃO!

Quando for momento de sugerir consolidação (encerramento de sessão ou pedido explícito):
- Responda APENAS COM TEXTO CONVERSACIONAL
- Pergunte naturalmente o que o aluno prefere
- NUNCA inclua [PROPOSAL] com action_type "suggest_consolidation"
- O aluno responderá por texto e você age de acordo

Exemplos de sugestões CORRETAS (apenas texto):
- "Bom estudo! 💪 Quer que eu transforme isso em um resumo rápido ou flashcards? Ou prefere deixar pra depois?"
- "Ótimo progresso! Posso consolidar isso em um resumo essencial ou criar flashcards. O que prefere?"
- "Pra não perder o que estudou, vale a pena um resumo? Posso fazer um bem direto ao ponto."

Quando o aluno responder (ex: "faz um resumo", "quero flashcards"):
- Aí sim você gera um [PROPOSAL] com action_type "create_summary" ou "create_flashcards_from_study"
- Isso garante que a ação seja executada

Fluxo esperado:
1. Aluno: "terminei por hoje"
2. NOMOS: "Bom estudo! Quer consolidar o que aprendeu? Posso fazer um resumo rápido ou flashcards." (APENAS TEXTO)
3. Aluno: "faz um resumo"
4. NOMOS: [Gera PROPOSAL com create_summary]

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
- "concluir tarefa" → action_type: "complete_task"
- "mover tarefa" → action_type: "move_task"

Consolidação de Aprendizado:
- detectou momento de consolidar → RESPONDA POR TEXTO (não gere PROPOSAL!)
- aluno pediu resumo → action_type: "create_summary" (type: "essential"|"exam")
- aluno pediu flashcards → action_type: "create_flashcards_from_study"
- adiar consolidação → responda por texto ("ok, deixamos pra depois")
- criar bloco de revisão → action_type: "create_review_block"

🚫🚫🚫 REGRA CRÍTICA - NUNCA GERE [PROPOSAL] COM CHOICES! 🚫🚫🚫

NUNCA use [PROPOSAL] para:
❌ suggest_notebook - pergunte por TEXTO qual caderno o aluno quer
❌ suggest_choice - pergunte por TEXTO onde salvar (post-it, tarefa, etc)
❌ suggest_consolidation - pergunte por TEXTO se quer resumo ou flashcards
❌ Qualquer sugestão com múltiplas opções - sempre TEXTO CONVERSACIONAL

Quando o aluno fizer perguntas sobre cadernos:
1. Responda POR TEXTO: "Vi que você tem o caderno X de Cálculo. Quer que eu abra?"
2. Se ele responder "sim" → aí sim gere [PROPOSAL] com action_type: "open_notebook"

Quando o aluno pedir para anotar algo:
1. Responda POR TEXTO: "Posso salvar como post-it ou tarefa. O que prefere?"
2. Se ele responder "post-it" → aí sim gere [PROPOSAL] com action_type: "create_postit"
3. Se ele responder "tarefa" → aí sim gere [PROPOSAL] com action_type: "create_task"

FORMATO DE PROPOSTA (SOMENTE para ações únicas confirmadas):
[PROPOSAL]{"action_type": "tipo", "description": "descrição clara", "impact": "impacto esperado", "payload": {dados específicos}}[/PROPOSAL]

⚠️ NUNCA inclua "choices" no PROPOSAL! Perguntas de múltipla escolha = TEXTO!

PAYLOADS POR TIPO (ações únicas, sem choices):

create_routine_block:
{"study_blocks": [{"focus": "matéria", "duration": "duração", "time_start": "horário"}]}

open_notebook (só após confirmação do aluno):
{"notebookId": "id", "notebookTitle": "título"}

complete_task / move_task:
{"taskId": "id", "category": "hoje|em-breve", "from": "origem", "to": "destino"}

create_postit (só após aluno escolher post-it):
{"text": "conteúdo a salvar", "blockId": "id do bloco (opcional)"}

create_task (só após aluno escolher tarefa):
{"text": "conteúdo da tarefa", "category": "hoje|entrada|em-breve"}

create_summary (OBRIGATÓRIO quando aluno pedir resumo):
{
  "type": "essential|exam",
  "subject": "matéria do resumo",
  "sourceNotebookId": "id do caderno fonte (opcional)",
  "content": "GERE O RESUMO COMPLETO AQUI - bullets claros e organizados com todo o conteúdo que foi discutido",
  "createFlashcards": true/false
}

⚠️ REGRA CRÍTICA PARA RESUMOS:
Quando o aluno pedir resumo (ex: "faz um resumo", "quero resumo", "pode resumir"):
1. SEMPRE gere [PROPOSAL] com action_type: "create_summary"
2. O campo "content" deve conter O RESUMO REAL E COMPLETO em bullets
3. NÃO mostre o resumo no texto da mensagem - ele vai no payload
4. O texto da mensagem deve ser apenas uma confirmação breve tipo "Feito! 📋"
5. O resumo será salvo automaticamente quando o aluno aplicar a proposta

Exemplo CORRETO:
Aluno: "faz um resumo do que estudamos"
NOMOS: "Preparei um resumo essencial do nosso estudo! 📋

[PROPOSAL]{"action_type": "create_summary", "description": "Resumo essencial de [matéria]", "impact": "Conteúdo consolidado para revisão", "payload": {"type": "essential", "subject": "Cálculo I - Limites", "content": "• Limite é o valor que uma função se aproxima quando x tende a um valor\n• Propriedades: soma, produto, quociente de limites\n• Limites laterais: esquerda e direita devem ser iguais\n• Limites infinitos e no infinito\n• Teorema do confronto", "createFlashcards": false}}[/PROPOSAL]"

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
function shouldSuggestConsolidation(
  context: ChatContext | undefined, 
  message: string,
  history: Array<{role: string, content: string}> | null
): {
  should: boolean;
  trigger: string;
  subject: string;
  studyDuration?: number;
} {
  if (!context) return { should: false, trigger: '', subject: '' };
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Skip if user is clearly asking about something else or already received an action
  const skipPhrases = ['[ação aplicada', 'criar tarefa', 'criar bloco', 'configurar rotina', 'ajuda com', 'como faço'];
  if (skipPhrases.some(phrase => lowerMessage.includes(phrase))) {
    return { should: false, trigger: '', subject: '' };
  }
  
  // RULE 1: Check if user is in ACTIVE STUDY MODE (asking questions)
  const userMessages = history?.filter(m => m.role === 'user') || [];
  const lastUserMessages = userMessages.slice(-3);
  const isAskingQuestions = lastUserMessages.some(m => 
    m.content?.includes('?') || 
    m.content?.toLowerCase().match(/^(o que|como|qual|quando|onde|por que|explica|me fala|me conta|dúvida)/i)
  );
  
  if (isAskingQuestions && !lowerMessage.match(/termin|encerr|valeu|tchau|por hoje|só isso|é isso/)) {
    return { should: false, trigger: '', subject: '' };
  }
  
  // RULE 2: Check for explicit consolidation requests
  const explicitRequests = [
    'faz um resumo', 'fazer resumo', 'cria resumo', 'quero resumo',
    'cria flashcard', 'criar flashcard', 'quero flashcard', 'gera flashcard',
    'consolida isso', 'consolidar', 'transforma em resumo', 'transforma em flashcard'
  ];
  
  if (explicitRequests.some(req => lowerMessage.includes(req))) {
    const subject = extractSubjectFromContext(context, message);
    return { 
      should: true, 
      trigger: 'pedido_explicito', 
      subject,
      studyDuration: calculateStudyDuration(context)
    };
  }
  
  // RULE 3: Check for session ending signals
  const sessionEndSignals = [
    'terminei por hoje', 'por hoje é isso', 'valeu, era isso', 'vou parar',
    'encerrar', 'até mais', 'tchau', 'é isso', 'só isso', 'terminei',
    'por hoje chega', 'basta por hoje', 'fechou', 'era só isso'
  ];
  
  if (sessionEndSignals.some(signal => lowerMessage.includes(signal))) {
    const subject = extractSubjectFromContext(context, message);
    if (subject || (context.completedStudyBlocks?.length || 0) > 0) {
      return { 
        should: true, 
        trigger: 'encerramento_sessao', 
        subject: subject || context.completedStudyBlocks?.[0]?.focusSubject || 'o estudo de hoje',
        studyDuration: calculateStudyDuration(context)
      };
    }
  }
  
  return { should: false, trigger: '', subject: '' };
}

function extractSubjectFromContext(context: ChatContext, message: string): string {
  // Try to get from completed study blocks
  if (context.completedStudyBlocks?.length) {
    return context.completedStudyBlocks[0].focusSubject || context.completedStudyBlocks[0].text || '';
  }
  
  // Try to get from active study blocks
  if (context.studyBlocks?.length) {
    return context.studyBlocks[0].focusSubject || context.studyBlocks[0].text || '';
  }
  
  // Try to extract from message
  const subjectMatch = message.match(/sobre\s+(.+?)(?:\s+para|\s+em|\s*$)/i);
  if (subjectMatch) return subjectMatch[1];
  
  return '';
}

function calculateStudyDuration(context: ChatContext): number {
  return context.stats?.totalStudyMinutesToday || 0;
}

interface ChatRequest {
  conversationId?: string;
  message: string;
  context?: ChatContext;
}

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
    console.error('[chat-nomos] Auth error:', error);
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
    
    const userId = authResult.userId;
    const { conversationId, message, context } = await req.json() as ChatRequest;
    
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
    
    // Check for consolidation triggers (now includes history for study mode detection)
    const consolidationCheck = shouldSuggestConsolidation(context, message, history);
    let consolidationHint = '';
    if (consolidationCheck.should) {
      consolidationHint = `\n\n[DICA INTERNA - CONSOLIDAÇÃO: Detectei oportunidade de consolidação (${consolidationCheck.trigger}). Assunto: "${consolidationCheck.subject}". ${consolidationCheck.studyDuration ? `Duração: ${consolidationCheck.studyDuration}min.` : ''} IMPORTANTE: Sugira por TEXTO CONVERSACIONAL (pergunte o que prefere: resumo ou flashcards). NÃO gere [PROPOSAL] para suggest_consolidation!]`;
    }
    
    // Check for relevant notebooks (only if not in block collection flow)
    const relevantNotebooks = findRelevantNotebooks(message, context?.notebooks);
    const collectingBlockInfo = isCollectingBlockInfo(history);
    let notebookHint = '';
    
    if (relevantNotebooks.length > 0 && !collectingBlockInfo) {
      notebookHint = `\n\n[DICA INTERNA: Encontrei cadernos relevantes: ${relevantNotebooks.map(n => `"${n.title}" (ID: ${n.id})`).join(', ')}. IMPORTANTE: Mencione por TEXTO CONVERSACIONAL ("Vi que você tem o caderno X..."). NÃO gere [PROPOSAL] para sugestão de cadernos! Só gere [PROPOSAL] com action_type "open_notebook" APÓS o aluno confirmar que quer abrir.]`;
    }

    // Build messages array for AI
    const messages = [
      { role: 'system', content: fullSystemPrompt + consolidationHint + notebookHint },
      ...(history || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log('[chat-nomos] Authenticated user:', userId);
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
        max_tokens: 3000,
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
