import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/task";
import { ImportCalendarModal } from "@/components/ImportCalendarModal";
import { ICSEvent, categorizeByDate } from "@/services/icsImporter";

const STORAGE_KEY = "nomos.tasks.today";

const NomosHome = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Load tasks from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse tasks from localStorage", e);
      }
    }
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    if (!inputValue.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      createdAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sourceType: 'manual',
    };

    setTasks((prev) => [newTask, ...prev]);
    setInputValue("");
  };

  const handleImport = (events: ICSEvent[]) => {
    const importedTasks: Task[] = events.map(event => ({
      id: event.id,
      text: event.title,
      description: event.description,
      createdAt: new Date().toISOString(),
      dueDate: event.end,
      course: event.location,
      category: categorizeByDate(event.end),
      sourceType: 'ava',
      completed: false,
    }));
    
    setTasks((prev) => [...importedTasks, ...prev]);
    window.dispatchEvent(new Event('tasksUpdated'));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTask();
    }
  };

  const completeTask = (taskId: string) => {
    setCompletingTasks((prev) => new Set(prev).add(taskId));

    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompletingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      
      // Dispatch custom event for count updates
      window.dispatchEvent(new Event("tasksUpdated"));
    }, 400);
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex-1 bg-background flex flex-col">
      {/* Main content */}
      <div className="px-6 py-8 md:py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">Entrada</h1>
            <Button 
              onClick={() => setImportModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Importar do AVA
            </Button>
          </div>
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="border-b border-border pb-3"
          >
            <div className="flex gap-3 items-center">
              <Button
                onClick={addTask}
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8"
                aria-label="Adicionar tarefa"
              >
                <Plus className="h-5 w-5" />
              </Button>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Adicionar tarefa"
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-0"
              />
            </div>
          </motion.div>

          {/* Tasks List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {tasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16"
                >
                  <p className="text-muted-foreground text-sm">
                    Nenhuma tarefa adicionada ainda.
                  </p>
                </motion.div>
              ) : (
                tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={
                      completingTasks.has(task.id)
                        ? {
                            opacity: 0,
                            y: -10,
                            height: 0,
                            transition: { duration: 0.4, ease: "easeOut" },
                          }
                        : { opacity: 1, y: 0, height: "auto" }
                    }
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-border hover:bg-muted/30 transition-colors overflow-hidden"
                  >
                    <div className="flex items-start gap-3 py-3 px-2">
                      <Checkbox
                        checked={completingTasks.has(task.id)}
                        onCheckedChange={() => completeTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <motion.p
                          animate={{
                            opacity: completingTasks.has(task.id) ? 0.4 : 1,
                          }}
                          className={`text-sm text-foreground leading-relaxed break-words ${
                            completingTasks.has(task.id) ? "line-through" : ""
                          }`}
                        >
                          {task.text}
                        </motion.p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-[hsl(var(--todoist-green))]" />
                            <span className="text-xs text-[hsl(var(--todoist-green))]">
                              {task.dueDate 
                                ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                                : 'Hoje'
                              }
                            </span>
                          </div>
                          {task.course && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {task.course}
                            </span>
                          )}
                          {task.sourceType === 'ava' && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                              AVA
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-4xl mx-auto text-center"
        >
          <p className="text-xs text-muted-foreground font-light">
            NOMOS.AI — MVP · Central do Dia
          </p>
        </motion.div>
      </footer>

      <ImportCalendarModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportSuccess={handleImport}
      />
    </div>
  );
};

export default NomosHome;
