/**
 * Fila de operações pendentes (offline / falha de rede).
 * Guarda só "qual id precisa ser enviado ou apagado"; o conteúdo é lido da
 * tarefa mais recente no momento do envio.
 */
export type OutboxOp = "upsert" | "delete";

export const OUTBOX_KEY = "nomos.tasks.outbox";

export function readOutbox(): Record<string, OutboxOp> {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OutboxOp>) : {};
  } catch {
    return {};
  }
}

export function writeOutbox(outbox: Record<string, OutboxOp>): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch (error) {
    console.error("[tasks] não foi possível gravar a fila de envio", error);
  }
}

/** Última operação vence: apagar depois de editar vira só "delete"; editar depois de apagar volta a "upsert". */
export function enqueue(outbox: Record<string, OutboxOp>, id: string, op: OutboxOp): Record<string, OutboxOp> {
  return { ...outbox, [id]: op };
}
