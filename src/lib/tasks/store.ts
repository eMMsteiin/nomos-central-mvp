import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/task";
import { diffTasks, isUuid, rowToTask, taskSignature, taskToRow } from "./mapping";
import { enqueue, readOutbox, writeOutbox } from "./outbox";

/**
 * Tarefas: o Supabase (tabela public.tasks) é a fonte de verdade.
 *
 * O localStorage (`nomos.tasks.today`) virou apenas um ESPELHO local, para a
 * tela abrir instantaneamente e continuar funcionando sem internet. Toda
 * escrita passa por `writeTasks`, que atualiza o espelho e enfileira o envio.
 * `syncTasks` (chamado ao abrir o app e ao voltar a ficar online) esvazia a
 * fila, importa as tarefas antigas do localStorage uma única vez e baixa o
 * estado do servidor.
 */

export const TASKS_CACHE_KEY = "nomos.tasks.today";
export const TASKS_UPDATED_EVENT = "tasksUpdated";
const BACKUP_KEY = "nomos.tasks.backup-pre-supabase";
const MIGRATED_PREFIX = "nomos.tasks.migrated.";
const DEVICE_ID_KEY = "nomos.device.id";
const BATCH_SIZE = 100;

// ---------- espelho local ----------

export function readTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch (error) {
    console.error("[tasks] espelho local ilegível", error);
    return [];
  }
}

function writeCache(tasks: Task[]): void {
  localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
}

function emitUpdated(): void {
  window.dispatchEvent(new Event(TASKS_UPDATED_EVENT));
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = "device_" + crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

// ---------- escrita (usada pelas telas) ----------

/** Substitui a lista inteira; só o que mudou é enviado ao servidor. */
export function writeTasks(next: Task[]): void {
  const prev = readTasks();
  const { upserts, deletes } = diffTasks(prev, next);

  writeCache(next);

  if (upserts.length || deletes.length) {
    let outbox = readOutbox();
    for (const task of upserts) outbox = enqueue(outbox, task.id, "upsert");
    for (const id of deletes) outbox = enqueue(outbox, id, "delete");
    writeOutbox(outbox);
    void flushOutbox();
  }
}

export function addTasks(newTasks: Task[]): void {
  writeTasks([...newTasks, ...readTasks()]);
}

export function patchTask(id: string, patch: Partial<Task>): void {
  writeTasks(readTasks().map((t) => (t.id === id ? { ...t, ...patch } : t)));
}

export function removeTask(id: string): void {
  writeTasks(readTasks().filter((t) => t.id !== id));
}

// ---------- envio ----------

let flushing = false;
let flushAgain = false;

export async function flushOutbox(): Promise<void> {
  if (flushing) {
    flushAgain = true;
    return;
  }
  flushing = true;
  try {
    do {
      flushAgain = false;
      await flushOnce();
    } while (flushAgain);
  } finally {
    flushing = false;
  }
}

async function flushOnce(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  const outbox = readOutbox();
  const cache = new Map(readTasks().map((t) => [t.id, t]));
  const deviceId = getDeviceId();

  const upsertTasks: Task[] = [];
  const deleteIds: string[] = [];
  const stale: string[] = [];

  for (const [id, op] of Object.entries(outbox)) {
    if (op === "delete") {
      if (isUuid(id)) deleteIds.push(id);
      else stale.push(id); // nunca chegou ao servidor
    } else {
      const task = cache.get(id);
      if (task && isUuid(id)) upsertTasks.push(task);
      else stale.push(id);
    }
  }

  try {
    for (let i = 0; i < upsertTasks.length; i += BATCH_SIZE) {
      const batch = upsertTasks.slice(i, i + BATCH_SIZE);
      const rows = batch.map((t) => taskToRow(t, userId, deviceId));
      const { error } = await supabase.from("tasks").upsert(rows as never, { onConflict: "id" });
      if (error) throw error;
    }
    if (deleteIds.length) {
      const { error } = await supabase.from("tasks").delete().in("id", deleteIds);
      if (error) throw error;
    }
  } catch (error) {
    console.error("[tasks] envio falhou; será tentado de novo na próxima sincronização", error);
    return;
  }

  // Remove da fila só o que não mudou durante o envio.
  const current = readOutbox();
  const latest = new Map(readTasks().map((t) => [t.id, t]));
  for (const id of stale) delete current[id];
  for (const sent of upsertTasks) {
    const now = latest.get(sent.id);
    if (now && taskSignature(now) !== taskSignature(sent)) continue;
    delete current[sent.id];
  }
  for (const id of deleteIds) {
    if (!latest.has(id)) delete current[id];
  }
  writeOutbox(current);
}

// ---------- sincronização ----------

/** Importa, uma vez por usuário, as tarefas que só existiam no localStorage. */
function migrateLegacyOnce(userId: string): void {
  const flag = MIGRATED_PREFIX + userId;
  if (localStorage.getItem(flag)) return;

  const raw = localStorage.getItem(TASKS_CACHE_KEY);
  if (raw && !localStorage.getItem(BACKUP_KEY)) {
    localStorage.setItem(BACKUP_KEY, raw); // cópia de segurança, nunca apagada
  }

  const tasks = readTasks();
  if (tasks.length) {
    let outbox = readOutbox();
    const normalized = tasks.map((t) => (isUuid(t.id) ? t : { ...t, id: crypto.randomUUID() }));
    writeCache(normalized);
    for (const t of normalized) outbox = enqueue(outbox, t.id, "upsert");
    writeOutbox(outbox);
  }
  localStorage.setItem(flag, new Date().toISOString());
}

let syncing: Promise<void> | null = null;

/** Esvazia a fila, importa o legado (1x) e baixa o estado do servidor para o espelho. */
export function syncTasks(): Promise<void> {
  if (!syncing) {
    syncing = doSync().finally(() => {
      syncing = null;
    });
  }
  return syncing;
}

async function doSync(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  migrateLegacyOnce(userId);
  await flushOutbox();

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[tasks] não foi possível baixar as tarefas", error);
    return;
  }

  const outbox = readOutbox();
  const local = new Map(readTasks().map((t) => [t.id, t]));
  const merged: Task[] = [];
  const seen = new Set<string>();

  // Pendências locais (ainda não confirmadas pelo servidor) ficam no topo.
  for (const [id, op] of Object.entries(outbox)) {
    const task = local.get(id);
    if (op === "upsert" && task) {
      merged.push(task);
      seen.add(id);
    } else if (op === "delete") {
      seen.add(id);
    }
  }
  for (const row of data ?? []) {
    if (seen.has(row.id)) continue;
    merged.push(rowToTask(row as never));
  }

  writeCache(merged);
  emitUpdated();
}
