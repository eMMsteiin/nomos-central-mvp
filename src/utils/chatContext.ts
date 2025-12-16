// Chat context collector - gathers context from all localStorage data for AI

export interface TaskContext {
  id: string;
  text: string;
  priority?: string;
  completed?: boolean;
  dueDate?: string;
  type?: string;
  focusSubject?: string;
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
  
  // Study blocks
  studyBlocks: TaskContext[];
  
  // Lembretes Rápidos
  postIts: PostItContext[];
  blocks: BlockContext[];
  
  // Cadernos
  notebooks: NotebookContext[];
  
  // Statistics
  stats: {
    completedToday: number;
    pendingTotal: number;
    studyBlocksToday: number;
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
  };
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
  
  const studyBlocks = todayRaw
    .filter(t => t.type === 'study-block' && !t.completed)
    .map(extractTaskContext);
  
  const entradaTasks = entradaRaw
    .filter(t => !t.completed)
    .map(extractTaskContext);
  
  const embreveTasks = embreveRaw
    .filter(t => !t.completed)
    .map(extractTaskContext);
  
  const completedTasks = [
    ...todayRaw.filter(t => t.completed),
    ...completedRaw
  ].slice(0, 10).map(extractTaskContext); // Last 10 completed
  
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
  
  return {
    todayTasks,
    entradaTasks,
    embreveTasks,
    completedTasks,
    studyBlocks,
    postIts,
    blocks,
    notebooks,
    stats: {
      completedToday,
      pendingTotal,
      studyBlocksToday: studyBlocks.length,
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
