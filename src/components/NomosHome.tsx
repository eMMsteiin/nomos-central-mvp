import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Task {
  id: string;
  text: string;
  createdAt: string;
  completed?: boolean;
}

const STORAGE_KEY = "nomos.tasks.today";

const NomosHome = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

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
    };

    setTasks((prev) => [newTask, ...prev]);
    setInputValue("");
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
    }, 600);
  };

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground mb-2">
            NOMOS
          </h1>
          <p className="text-sm md:text-base text-muted-foreground capitalize">
            {today}
          </p>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 md:py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="p-6 shadow-sm">
              <div className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Adicionar nova tarefa..."
                  className="flex-1 border-border focus-visible:ring-ring text-base"
                />
                <Button
                  onClick={addTask}
                  size="icon"
                  className="shrink-0"
                  aria-label="Adicionar tarefa"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </Card>
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
                            x: 100,
                            scale: 0.95,
                            transition: { duration: 0.5, ease: "easeInOut" },
                          }
                        : { opacity: 1, y: 0, x: 0, scale: 1 }
                    }
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={completingTasks.has(task.id)}
                          onCheckedChange={() => completeTask(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 flex items-start justify-between gap-4">
                          <motion.p
                            animate={{
                              opacity: completingTasks.has(task.id) ? 0.4 : 1,
                            }}
                            className={`text-base text-foreground leading-relaxed flex-1 ${
                              completingTasks.has(task.id) ? "line-through" : ""
                            }`}
                          >
                            {task.text}
                          </motion.p>
                          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                            <Clock className="h-3.5 w-3.5" />
                            <span className="text-xs font-light">
                              {task.createdAt}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

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
    </div>
  );
};

export default NomosHome;
