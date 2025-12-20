// Chat context collector - gathers context from all localStorage data for AI

export interface TaskContext {
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
  timerElapsed?: number;
}

export interface PostItContext {
  id: string;
  text: string;
  blockTitle?: string;
  color?: string;
}

export interface NotebookContext {
  id: string;
  title: string;
  discipline?: string;
  subject?: string;
  textNotes?: string;
  updatedAt: string;
  pageCount: number;
}

export interface BlockContext {
  id: string;
  title: string;
  type: 'weekly' | 'daily';
  postItCount: number;
}

export interface ChatContext {
  // Tasks by category
  todayTasks: TaskContext[];
  entradaTasks: TaskContext[];
  embreveTasks: TaskContext[];
  completedTasks: TaskContext[];
  
  // Study blocks (active and completed)
  studyBlocks: TaskContext[];
  completedStudyBlocks: TaskContext[];
  
  // Lembretes Rápidos
  postIts: PostItContext[];
  blocks: BlockContext[];
  
  // Cadernos
  notebooks: NotebookContext[];
  
  // Upcoming exams (tasks with "prova" or "teste" in text, within 7 days)
  upcomingExams: TaskContext[];
  
  // Statistics
  stats: {
    completedToday: number;
    pendingTotal: number;
    studyBlocksToday: number;
    completedStudyBlocksToday: number;
    totalStudyMinutesToday: number;
    totalPostIts: number;
    totalNotebooks: number;
  };
  
  // Current timestamp for context
  currentTime: string;
  currentDate: string;
}

// Storage keys
const TASKS_TODAY_KEY = 'nomos.tasks.today';
const TASKS_ENTRADA_KEY = 'nomos.tasks.entrada';
const TASKS_EMBREVE_KEY = 'nomos.tasks.embreve';
const TASKS_COMPLETED_KEY = 'nomos.tasks.completed';
const POSTITS_KEY = 'nomos-postits';
const BLOCKS_KEY = 'nomos-blocks';
const NOTEBOOKS_KEY = 'nomos-notebooks';

function safeParseJSON<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function extractTaskContext(task: Record<string, unknown>): TaskContext {
  return {
    id: task.id as string,
    text: task.text as string,
    priority: task.priority as string | undefined,
    completed: task.completed as boolean | undefined,
    dueDate: task.dueDate ? new Date(task.dueDate as string).toLocaleDateString('pt-BR') : undefined,
    type: task.type as string | undefined,
    focusSubject: task.focusSubject as string | undefined,
    durationMinutes: task.durationMinutes as number | undefined,
    timerStartedAt: task.timerStartedAt as string | undefined,
    timerPausedAt: task.timerPausedAt as string | undefined,
    timerElapsed: task.timerElapsed as number | undefined,
  };
}

// Check if a task looks like an exam (prova, teste, avaliação)
function isExamTask(task: Record<string, unknown>): boolean {
  const text = (task.text as string || '').toLowerCase();
  const examKeywords = ['prova', 'teste', 'avaliação', 'exame', 'p1', 'p2', 'p3', 'av1', 'av2', 'av3'];
  return examKeywords.some(keyword => text.includes(keyword));
}

// Check if date is within N days from now
function isWithinDays(dateStr: string | undefined, days: number): boolean {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= days;
  } catch {
    return false;
  }
}

export function collectChatContext(): ChatContext {
  const now = new Date();
  
  // Load tasks from different categories
  const todayRaw = safeParseJSON<Record<string, unknown>[]>(TASKS_TODAY_KEY, []);
  const entradaRaw = safeParseJSON<Record<string, unknown>[]>(TASKS_ENTRADA_KEY, []);
  const embreveRaw = safeParseJSON<Record<string, unknown>[]>(TASKS_EMBREVE_KEY, []);
  const completedRaw = safeParseJSON<Record<string, unknown>[]>(TASKS_COMPLETED_KEY, []);
  
  // Separate regular tasks from study blocks
  const todayTasks = todayRaw
    .filter(t => t.type !== 'study-block' && !t.completed)
    .map(extractTaskContext);
  
  // Active study blocks (not completed)
  const studyBlocks = todayRaw
    .filter(t => t.type === 'study-block' && !t.completed)
    .map(extractTaskContext);
  
  // Completed study blocks today (for consolidation triggers)
  const completedStudyBlocks = todayRaw
    .filter(t => t.type === 'study-block' && t.completed)
    .map(extractTaskContext);
  
  const entradaTasks = entradaRaw
    .filter(t => !t.completed)
    .map(extractTaskContext);
  
  const embreveTasks = embreveRaw
    .filter(t => !t.completed)
    .map(extractTaskContext);
  
  const completedTasks = [
    ...todayRaw.filter(t => t.completed && t.type !== 'study-block'),
    ...completedRaw
  ].slice(0, 10).map(extractTaskContext);
  
  // Find upcoming exams (within 7 days)
  const allTasks = [...todayRaw, ...embreveRaw, ...entradaRaw];
  const upcomingExams = allTasks
    .filter(t => isExamTask(t) && !t.completed && isWithinDays(t.dueDate as string, 7))
    .map(extractTaskContext)
    .slice(0, 5);
  
  // Load post-its and blocks
  const postItsRaw = safeParseJSON<Record<string, unknown>[]>(POSTITS_KEY, []);
  const blocksRaw = safeParseJSON<Record<string, unknown>[]>(BLOCKS_KEY, []);
  
  // Map blocks for quick lookup
  const blockMap = new Map<string, string>();
  blocksRaw.forEach(b => {
    blockMap.set(b.id as string, b.title as string || 'Sem título');
  });
  
  const postIts: PostItContext[] = postItsRaw.map(p => ({
    id: p.id as string,
    text: p.text as string || p.content as string || '',
    blockTitle: blockMap.get(p.blockId as string),
    color: p.color as string,
  }));
  
  const blocks: BlockContext[] = blocksRaw.map(b => ({
    id: b.id as string,
    title: b.title as string || '',
    type: b.type as 'weekly' | 'daily',
    postItCount: postItsRaw.filter(p => p.blockId === b.id).length,
  }));
  
  // Load notebooks
  const notebooksRaw = safeParseJSON<Record<string, unknown>[]>(NOTEBOOKS_KEY, []);
  
  const notebooks: NotebookContext[] = notebooksRaw.map(n => ({
    id: n.id as string,
    title: n.title as string,
    discipline: n.discipline as string | undefined,
    subject: n.subject as string | undefined,
    textNotes: n.textNotes as string | undefined,
    updatedAt: n.updatedAt as string,
    pageCount: (n.pages as unknown[])?.length || 1,
  }));
  
  // Calculate stats
  const completedToday = todayRaw.filter(t => t.completed).length;
  const pendingTotal = todayTasks.length + entradaTasks.length + embreveTasks.length;
  const completedStudyBlocksToday = completedStudyBlocks.length;
  
  // Calculate total study minutes today
  const totalStudyMinutesToday = completedStudyBlocks.reduce((total, block) => {
    return total + (block.durationMinutes || 0);
  }, 0);
  
  return {
    todayTasks,
    entradaTasks,
    embreveTasks,
    completedTasks,
    studyBlocks,
    completedStudyBlocks,
    postIts,
    blocks,
    notebooks,
    upcomingExams,
    stats: {
      completedToday,
      pendingTotal,
      studyBlocksToday: studyBlocks.length,
      completedStudyBlocksToday,
      totalStudyMinutesToday,
      totalPostIts: postIts.length,
      totalNotebooks: notebooks.length,
    },
    currentTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    currentDate: now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

// Helper to search notebooks by keywords
export function searchNotebooksByKeywords(context: ChatContext, keywords: string[]): NotebookContext[] {
  const normalizedKeywords = keywords.map(k => k.toLowerCase().trim());
  
  return context.notebooks.filter(notebook => {
    const searchableText = [
      notebook.title,
      notebook.discipline,
      notebook.subject,
      notebook.textNotes,
    ].filter(Boolean).join(' ').toLowerCase();
    
    return normalizedKeywords.some(keyword => searchableText.includes(keyword));
  });
}
