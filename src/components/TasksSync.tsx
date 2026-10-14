import { useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { syncTasks } from "@/lib/tasks/store";

/** Mantém o espelho local das tarefas alinhado com o Supabase (sem renderizar nada). */
export function TasksSync() {
  const { userId } = useAuthContext();

  useEffect(() => {
    if (!userId) return;

    void syncTasks();

    const onOnline = () => void syncTasks();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncTasks();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  return null;
}
