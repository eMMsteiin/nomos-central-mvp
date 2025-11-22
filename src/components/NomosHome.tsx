import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Download, Clock, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/task";
import { ImportCalendarModal } from "@/components/ImportCalendarModal";
import { ICSEvent, categorizeByDate } from "@/services/icsImporter";
import { extractTimeFromText, formatDateToTime } from "@/services/timeExtractor";
import { EditTaskDialog } from "@/components/EditTaskDialog";

const STORAGE_KEY = "nomos.tasks.today";

interface NomosHomeProps {
  filterMode?: 'entrada' | 'hoje' | 'em-breve' | 'all';
}

const NomosHome = ({ filterMode = 'all' }: NomosHomeProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('baixa');

  const cyclePriority = () => {
    setPriority((prev) => {
      if (prev === 'baixa') return 'media';
      if (prev === 'media') return 'alta';
      return 'baixa';
    });
  };
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

    const { cleanText, time } = extractTimeFromText(inputValue.trim());

    const newTask: Task = {
      id: Date.now().toString(),
      text: cleanText,
      createdAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dueTime: time,
      priority: priority,
      sourceType: 'manual',
      category: 'hoje',
    };

    setTasks((prev) => [newTask, ...prev]);
    setInputValue("");
    setPriority('baixa');
  };

  const handleImport = (events: ICSEvent[]) => {
    const importedTasks: Task[] = events.map(event => ({
      id: event.id,
      text: event.title,
      description: event.description,
      createdAt: new Date().toISOString(),
      dueDate: event.end,
      dueTime: formatDateToTime(event.start),
      course: event.location,
      category: categorizeByDate(event.end),
      priority: 'media',
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

  const handleEditTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    
    const allTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = allTasks.map((t: Task) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("tasksUpdated"));
  };

  // Filter tasks based on filterMode
  const displayedTasks = tasks.filter(task => {
    if (task.completed) return false;
    
    if (filterMode === 'all') return true;
    if (filterMode === 'hoje') return task.category === 'hoje';
    if (filterMode === 'entrada') {
      return task.category === 'hoje' || task.category === 'entrada' || !task.category;
    }
    if (filterMode === 'em-breve') return task.category === 'em-breve';
    
    return false;
  });

  const getTitle = () => {
    if (filterMode === 'hoje') return 'Hoje';
    if (filterMode === 'entrada') return 'Entrada';
    if (filterMode === 'em-breve') return 'Em breve';
    return 'Todas as tarefas';
  };

  return (
    <div className="flex-1 bg-background flex flex-col relative">
      {/* Main content */}
      <div className="px-6 py-8 md:py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold">{getTitle()}</h1>
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
              
              {/* Estrela de Prioridade */}
              <Button
                onClick={cyclePriority}
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8 relative group"
                aria-label="Alternar prioridade"
              >
                <Star
                  className={`h-5 w-5 transition-all duration-300 ${
                    priority === 'alta'
                      ? 'fill-destructive text-destructive'
                      : priority === 'media'
                      ? 'fill-primary text-primary'
                      : 'fill-secondary text-secondary'
                  }`}
                />
                
                {/* Tooltip minimalista */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {priority === 'alta' ? 'Alta' : priority === 'media' ? 'Média' : 'Baixa'}
                </span>
              </Button>
              
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Adicionar tarefa (ex: Estudar 14:30)"
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-0"
              />
            </div>
          </motion.div>

          {/* Tasks List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {displayedTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16"
                >
            <p className="text-muted-foreground text-sm">
              {filterMode === 'hoje' 
                ? "Ops nenhuma tarefa para hoje. Vida fácil em!!!" 
                : "Nenhuma tarefa nesta categoria."
              }
            </p>
                </motion.div>
              ) : (
                displayedTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={
                      completingTasks.has(task.id)
                        ? {
                            opacity: 0,
                            scale: 0.9,
                            x: 100,
                            transition: { 
                              duration: 0.5, 
                              ease: [0.4, 0, 0.2, 1]
                            },
                          }
                        : { 
                            opacity: 1, 
                            scale: 1, 
                            y: 0,
                            transition: {
                              duration: 0.4,
                              ease: [0.4, 0, 0.2, 1],
                              delay: index * 0.03
                            }
                          }
                    }
                    exit={{ 
                      opacity: 0, 
                      scale: 0.9,
                      x: 100,
                      transition: { duration: 0.3 }
                    }}
                    className="hover:bg-muted/20 rounded-lg transition-all duration-200 overflow-hidden group"
                  >
                    <div className="flex items-start gap-3 py-2 px-1">
                      <Checkbox
                        checked={completingTasks.has(task.id)}
                        onCheckedChange={() => completeTask(task.id)}
                        className="mt-0.5"
                      />
                      
                      {/* Priority Bar */}
                      <div
                        className={`w-1 h-full rounded-full self-stretch ${
                          task.priority === 'alta' 
                            ? 'bg-destructive' 
                            : task.priority === 'media'
                            ? 'bg-primary'
                            : 'bg-secondary'
                        }`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
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
                            
                            {/* Priority Badge */}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                task.priority === 'alta'
                                  ? 'bg-destructive/10 text-destructive'
                                  : task.priority === 'media'
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-secondary/10 text-secondary'
                              }`}
                            >
                              {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                            </span>
                          </div>
                          
                          {/* Edit Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditingTask(task)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        
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
                          
                          {task.dueTime && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {task.dueTime}
                                </span>
                              </div>
                            </>
                          )}
                          
                          {task.course && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                {task.course}
                              </span>
                            </>
                          )}
                          
                          {task.sourceType === 'ava' && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                                AVA
                              </span>
                            </>
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

      {editingTask && (
        <EditTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSave={handleEditTask}
        />
      )}
    </div>
  );
};

export default NomosHome;
