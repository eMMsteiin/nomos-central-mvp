import type { Task } from "@/types/task";

/**
 * Funções puras (sem rede, sem localStorage) que convertem entre o formato
 * da interface (Task) e a linha da tabela public.tasks do Supabase.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string | undefined | null): value is string =>
  !!value && UUID_RE.test(value);

/** Linha da tabela `tasks` como o app a lê/escreve (inclui `course`, ver migration). */
export interface TaskDbRow {
  id: string;
  user_id: string;
  device_id: string;
  text: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  category: string;
  source_type: string;
  completed: boolean;
  type: string;
  course: string | null;
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
}

const toIso = (value: Date | string | undefined | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function taskToRow(task: Task, userId: string, deviceId: string): TaskDbRow {
  return {
    id: task.id,
    user_id: userId,
    device_id: deviceId,
    text: task.text,
    description: task.description ?? null,
    due_date: toIso(task.dueDate),
    due_time: task.dueTime ?? null,
    priority: task.priority ?? "baixa",
    category: task.category ?? "entrada",
    source_type: task.sourceType ?? "manual",
    completed: !!task.completed,
    type: task.type ?? "task",
    course: task.course ?? null,
    start_time: task.startTime ?? null,
    end_time: task.endTime ?? null,
    duration_minutes: task.durationMinutes ?? null,
    focus_subject: task.focusSubject ?? null,
    timer_started_at: task.timerStartedAt ?? null,
    timer_paused_at: task.timerPausedAt ?? null,
    timer_remaining_seconds: task.timerRemainingSeconds ?? null,
    canva_design_url: task.canvaDesignUrl ?? null,
    canva_design_title: task.canvaDesignTitle ?? null,
    canva_time_spent: task.canvaTimeSpent ?? null,
    canva_last_opened: task.canvaLastOpened ?? null,
    is_canva_task: !!task.isCanvaTask,
  };
}

type RowFromServer = Partial<TaskDbRow> & { id: string; text: string; created_at?: string | null };

/** Linha do servidor -> Task. Datas ficam como texto ISO (igual ao que o localStorage guardava). */
export function rowToTask(row: RowFromServer): Task {
  return {
    id: row.id,
    supabaseId: row.id,
    deviceId: row.device_id,
    text: row.text,
    description: row.description ?? undefined,
    dueDate: (row.due_date ?? undefined) as unknown as Task["dueDate"],
    dueTime: row.due_time ?? undefined,
    priority: (row.priority as Task["priority"]) ?? "baixa",
    category: (row.category as Task["category"]) ?? "entrada",
    sourceType: (row.source_type as Task["sourceType"]) ?? "manual",
    completed: !!row.completed,
    type: (row.type as Task["type"]) ?? "task",
    course: row.course ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
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
    isCanvaTask: !!row.is_canva_task,
  };
}

/** Assinatura estável do que é enviado ao servidor; duas tarefas iguais têm a mesma assinatura. */
export function taskSignature(task: Task): string {
  const { id: _id, user_id: _u, device_id: _d, ...rest } = taskToRow(task, "", "");
  return JSON.stringify(rest);
}

export interface TaskDiff {
  upserts: Task[];
  deletes: string[];
}

/** O que mudou entre duas listas (por id). */
export function diffTasks(prev: Task[], next: Task[]): TaskDiff {
  const prevById = new Map(prev.map((t) => [t.id, t]));
  const nextIds = new Set(next.map((t) => t.id));

  const upserts = next.filter((t) => {
    const before = prevById.get(t.id);
    return !before || taskSignature(before) !== taskSignature(t);
  });
  const deletes = prev.filter((t) => !nextIds.has(t.id)).map((t) => t.id);

  return { upserts, deletes };
}
