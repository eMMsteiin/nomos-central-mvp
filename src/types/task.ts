export interface Task {
  id: string;
  text: string;
  description?: string;
  createdAt: string;
  dueDate?: Date;
  dueTime?: string;
  course?: string;
  category?: 'hoje' | 'entrada' | 'em-breve';
  priority?: 'alta' | 'media' | 'baixa';
  sourceType?: 'manual' | 'ava' | 'chat';
  completed?: boolean;
  // Canva integration fields
  canvaDesignUrl?: string;
  canvaDesignTitle?: string;
  canvaTimeSpent?: number;
  canvaLastOpened?: string;
  isCanvaTask?: boolean;
  // Study block fields
  type?: 'task' | 'study-block';
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  focusSubject?: string;
  timerStartedAt?: string;
  timerPausedAt?: string;
  timerRemainingSeconds?: number;
  // Supabase sync fields
  supabaseId?: string;
  deviceId?: string;
}

export interface SubTask {
  id: string;
  taskId: string;
  text: string;
  completed: boolean;
  position: number;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  position: number;
  createdAt: string;
}

// Block system types (Notion-style)
export type TaskBlockType = 'subtask' | 'image' | 'text' | 'divider';

export interface SubtaskContent {
  text: string;
  completed: boolean;
}

export interface ImageContent {
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  width?: number; // Percentage width (10-100), default 60
}

export interface TextContent {
  text: string;
}

export interface TaskBlock {
  id: string;
  taskId: string;
  type: TaskBlockType;
  content: SubtaskContent | ImageContent | TextContent | Record<string, never>;
  position: number;
  createdAt: string;
}

export interface TaskBlockRow {
  id: string;
  task_id: string;
  type: string;
  content: Record<string, unknown>;
  position: number;
  created_at: string;
}

export function blockRowToBlock(row: TaskBlockRow): TaskBlock {
  return {
    id: row.id,
    taskId: row.task_id,
    type: row.type as TaskBlockType,
    content: row.content as TaskBlock['content'],
    position: row.position,
    createdAt: row.created_at,
  };
}

// Supabase row types (snake_case)
export interface TaskRow {
  id: string;
  device_id: string;
  text: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string | null;
  category: string | null;
  source_type: string | null;
  completed: boolean;
  type: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  focus_subject: string | null;
  timer_started_at: string | null;
  timer_paused_at: string | null;
  timer_remaining_seconds: number | null;
  canva_design_url: string | null;
  canva_design_title: string | null;
  canva_time_spent: number | null;
  canva_last_opened: string | null;
  is_canva_task: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubTaskRow {
  id: string;
  task_id: string;
  text: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskAttachmentRow {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  position: number;
  created_at: string;
}

// Converters
export function taskRowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    supabaseId: row.id,
    deviceId: row.device_id,
    text: row.text,
    description: row.description ?? undefined,
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    dueTime: row.due_time ?? undefined,
    priority: (row.priority as Task['priority']) ?? 'baixa',
    category: (row.category as Task['category']) ?? 'entrada',
    sourceType: (row.source_type as Task['sourceType']) ?? 'manual',
    completed: row.completed,
    type: (row.type as Task['type']) ?? 'task',
    createdAt: row.created_at,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    focusSubject: row.focus_subject ?? undefined,
    timerStartedAt: row.timer_started_at ?? undefined,
    timerPausedAt: row.timer_paused_at ?? undefined,
    timerRemainingSeconds: row.timer_remaining_seconds ?? undefined,
    canvaDesignUrl: row.canva_design_url ?? undefined,
    canvaDesignTitle: row.canva_design_title ?? undefined,
    canvaTimeSpent: row.canva_time_spent ?? undefined,
    canvaLastOpened: row.canva_last_opened ?? undefined,
    isCanvaTask: row.is_canva_task,
  };
}

export function subtaskRowToSubtask(row: SubTaskRow): SubTask {
  return {
    id: row.id,
    taskId: row.task_id,
    text: row.text,
    completed: row.completed,
    position: row.position,
    createdAt: row.created_at,
  };
}

export function attachmentRowToAttachment(row: TaskAttachmentRow): TaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    fileUrl: row.file_url,
    fileName: row.file_name ?? undefined,
    fileType: row.file_type ?? undefined,
    position: row.position,
    createdAt: row.created_at,
  };
}
