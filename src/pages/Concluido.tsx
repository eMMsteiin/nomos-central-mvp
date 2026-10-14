import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "@/types/task";
import { patchTask, readTasks } from "@/lib/tasks/store";

const Concluido = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const load = () => setTasks(readTasks().filter((t) => t.completed));
    load();
    window.addEventListener("tasksUpdated", load);
    return () => window.removeEventListener("tasksUpdated", load);
  }, []);

  const reopen = (id: string) => {
    patchTask(id, { completed: false });
    window.dispatchEvent(new Event("tasksUpdated"));
  };

  return (
    <div className="px-6 py-8 relative">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-base font-medium mb-6">Concluído</h1>

        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Suas tarefas concluídas aparecerão aqui.
          </p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="group flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
              >
                <span className="text-sm text-muted-foreground line-through">{task.text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => reopen(task.id)}
                >
                  <RotateCcw className="h-3 w-3" />
                  Reabrir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Concluido;
