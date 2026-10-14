import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { db, isMissingTable } from "@/lib/supabaseUntyped";
import { addTasks, flushOutbox } from "@/lib/tasks/store";
import type { Task } from "@/types/task";
import { Ciclo, CicloRow, CicloStatus, cicloFromRow } from "@/types/trilha";

export type DiaExperimento = "hoje" | "amanha" | "semana";

/** Converte a escolha de quando fazer em categoria + data da tarefa. */
function agendar(dia: DiaExperimento): { category: Task["category"]; dueDate: string } {
  const date = new Date();
  if (dia === "amanha") date.setDate(date.getDate() + 1);
  if (dia === "semana") date.setDate(date.getDate() + 5);
  date.setHours(12, 0, 0, 0);
  return { category: dia === "hoje" ? "hoje" : "em-breve", dueDate: date.toISOString() };
}

/** Ciclos da Trilha do usuário (tabela public.trilha_ciclos, privada por RLS). */
export function useTrilha() {
  const { userId } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ["trilha-ciclos", userId];
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async (): Promise<{ ciclos: Ciclo[]; tableMissing: boolean }> => {
      const { data, error } = await db
        .from("trilha_ciclos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        if (isMissingTable(error)) return { ciclos: [], tableMissing: true };
        throw error;
      }
      return { tableMissing: false, ciclos: (data as CicloRow[]).map(cicloFromRow) };
    },
  });

  /** 1) Pergunta: abre um ciclo novo. */
  const criar = useMutation({
    mutationFn: async (question: string) => {
      const { data, error } = await db
        .from("trilha_ciclos")
        .insert({ question: question.trim(), status: "experimento" satisfies CicloStatus })
        .select()
        .single();
      if (error) throw error;
      return cicloFromRow(data as CicloRow);
    },
    onSuccess: refresh,
  });

  /** 2) Experimento: cria a tarefa na Central do Dia e liga ao ciclo. */
  const escolherExperimento = useMutation({
    mutationFn: async (args: { ciclo: Ciclo; experimento: string; dia: DiaExperimento }) => {
      const { category, dueDate } = agendar(args.dia);
      const task: Task = {
        id: crypto.randomUUID(),
        text: `Experimento: ${args.experimento.trim()}`,
        description: `Da sua Trilha — pergunta: ${args.ciclo.question}`,
        createdAt: new Date().toISOString(),
        dueDate: dueDate as unknown as Task["dueDate"],
        category,
        priority: "media",
        sourceType: "manual",
      };
      addTasks([task]);
      window.dispatchEvent(new Event("tasksUpdated"));
      await flushOutbox(); // tenta enviar já; se estiver offline o ciclo segue e a tarefa sobe depois

      const { error } = await db
        .from("trilha_ciclos")
        .update({ experiment: args.experimento.trim(), task_id: task.id, status: "executando" satisfies CicloStatus })
        .eq("id", args.ciclo.id);
      if (error) throw error;
      return task;
    },
    onSuccess: refresh,
  });

  /** 3) Fez o experimento: passa para a reflexão. */
  const irParaReflexao = useMutation({
    mutationFn: async (cicloId: string) => {
      const { error } = await db
        .from("trilha_ciclos")
        .update({ status: "reflexao" satisfies CicloStatus })
        .eq("id", cicloId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  /** 4) Reflexão: fecha o ciclo (um "ciclo significativo concluído"). */
  const concluir = useMutation({
    mutationFn: async (args: { cicloId: string; reflection: string; clarity: number | null }) => {
      const { error } = await db
        .from("trilha_ciclos")
        .update({
          reflection: args.reflection.trim() || null,
          clarity: args.clarity,
          status: "concluido" satisfies CicloStatus,
          completed_at: new Date().toISOString(),
        })
        .eq("id", args.cicloId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  /** Agência e privacidade: o usuário pode apagar qualquer ciclo. */
  const apagar = useMutation({
    mutationFn: async (cicloId: string) => {
      const { error } = await db.from("trilha_ciclos").delete().eq("id", cicloId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  return {
    ciclos: query.data?.ciclos ?? [],
    tableMissing: query.data?.tableMissing ?? false,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    criar,
    escolherExperimento,
    irParaReflexao,
    concluir,
    apagar,
  };
}
