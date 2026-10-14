import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Download, Clock, Pencil, Star, Palette, AlertCircle, ChevronRight, ListTodo, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/task";
import { ImportCalendarModal } from "@/components/ImportCalendarModal";
import { ICSEvent, categorizeByDate } from "@/services/icsImporter";
import { extractTimeFromText, formatDateToTime } from "@/services/timeExtractor";
import { extractDateFromText, categorizeByDetectedDate } from "@/services/dateExtractor";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { useCanvaSession } from "@/contexts/CanvaSessionContext";
import { isCanvaRelatedTask } from "@/types/canva";
import { toast } from "@/hooks/use-toast";
import { StudyBlockItem } from "@/components/StudyBlockItem";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { TimePickerPopover } from "@/components/task/TimePickerPopover";
import { DatePickerPopover } from "@/components/task/DatePickerPopover";
import { addTasks, patchTask, readTasks, writeTasks } from "@/lib/tasks/store";

// Helper function to format task date with smart labels and status
const formatTaskDate = (date: Date | string | undefined): { 
  text: string; 
  isOverdue: boolean; 
  isToday: boolean; 
  isTomorrow: boolean;
} => {
  if (!date) return { text: 'Sem data', isOverdue: false, isToday: false, isTomorrow: false };
  
  const taskDate = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Normalize to compare only day (ignore time)
  const normalizedTask = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  
  const isToday = normalizedTask.getTime() === normalizedToday.getTime();
  const isTomorrow = normalizedTask.getTime() === normalizedTomorrow.getTime();
  const isOverdue = normalizedTask.getTime() < normalizedToday.getTime();
  
  let text: string;
  if (isToday) {
    text = 'Hoje';
  } else if (isTomorrow) {
    text = 'Amanhã';
  } else {
    // Format as "15 dez" (day + abbreviated month)
    text = taskDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
  }
  
  return { text, isOverdue, isToday, isTomorrow };
};

interface NomosHomeProps {
  filterMode?: 'entrada' | 'hoje' | 'em-breve' | 'all';
}

const NomosHome = ({ filterMode = 'all' }: NomosHomeProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskMeta, setTaskMeta] = useState<Record<string, { subtaskCount: number; attachmentCount: number }>>({});
  const [inputValue, setInputValue] = useState("");
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('baixa');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [prefilledTaskText, setPrefilledTaskText] = useState('');
  const [manualTime, setManualTime] = useState<string | undefined>();
  const [manualDate, setManualDate] = useState<Date | undefined>();
  const isInitialMount = useRef(true);

  const { session, settings, startSession, openCanvaPopout } = useCanvaSession();

  // Handle URL params for pre-filled task creation from Chat
  useEffect(() => {
    const newTask = searchParams.get('newTask');
    const text = searchParams.get('text');
    
    if (newTask === 'true' && text) {
      setPrefilledTaskText(decodeURIComponent(text));
      setAddTaskDialogOpen(true);
      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const cyclePriority = () => {
    setPriority((prev) => {
      if (prev === 'baixa') return 'media';
      if (prev === 'media') return 'alta';
      return 'baixa';
    });
  };

  // Carrega o espelho local das tarefas (o Supabase é sincronizado por <TasksSync />)
  useEffect(() => {
    setTasks(readTasks());
  }, []);

  // Recarrega quando outra tela (ou a sincronização) atualizar as tarefas
  useEffect(() => {
    const handleTasksUpdated = () => setTasks(readTasks());

    window.addEventListener('tasksUpdated', handleTasksUpdated);
    return () => window.removeEventListener('tasksUpdated', handleTasksUpdated);
  }, []);

  // Persiste mudanças de estado (ex.: cronômetro de bloco de estudo); só o que mudou vai ao Supabase
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    writeTasks(tasks);
  }, [tasks]);

  // Mutex para evitar criação duplicada por duplo submit
  const isCreatingTask = useRef(false);

  const addTask = async () => {
    if (!inputValue.trim()) return;
    
    // Evitar duplo submit
    if (isCreatingTask.current) return;
    isCreatingTask.current = true;

    try {
      const { cleanText: textWithoutDate, detectedDate, category: detectedCategory } = extractDateFromText(inputValue.trim());
      const { cleanText, time } = extractTimeFromText(textWithoutDate);

      // Priorizar valores manuais sobre valores extraídos do texto
      const finalTime = manualTime || time;
      const finalDate = manualDate || detectedDate;

      // Se nenhuma data foi detectada, usar a aba atual como categoria
      let finalCategory = finalDate ? categorizeByDetectedDate(finalDate) : detectedCategory;
      if (!finalDate && (filterMode === 'hoje' || filterMode === 'entrada')) {
        finalCategory = filterMode;
      }

      const taskId = crypto.randomUUID();

      const newTask: Task = {
        id: taskId,
        text: cleanText,
        createdAt: new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dueTime: finalTime,
        dueDate: finalDate,
        priority: priority,
        sourceType: 'manual',
        category: finalCategory,
        isCanvaTask: isCanvaRelatedTask(cleanText),
      };

      // Grava no espelho local e enfileira o envio ao Supabase
      addTasks([newTask]);

      setTasks(readTasks());
      setInputValue("");
      setPriority('baixa');
      setManualTime(undefined);
      setManualDate(undefined);

      window.dispatchEvent(new Event('tasksUpdated'));
    } finally {
      isCreatingTask.current = false;
    }
  };

  const handleImport = (events: ICSEvent[]) => {
    const importedTasks: Task[] = events.map(event => ({
      id: crypto.randomUUID(),
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
      isCanvaTask: isCanvaRelatedTask(event.title),
    }));

    addTasks(importedTasks);

    setTasks(readTasks());
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
      // Concluir não apaga: marca como concluída (aparece em "Concluído")
      patchTask(taskId, { completed: true });

      setTasks(readTasks());
      setCompletingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      
      window.dispatchEvent(new Event("tasksUpdated"));
    }, 400);
  };

  // Função dedicada para blocos de estudo - marca como completo imediatamente e persiste
  const completeStudyBlock = (taskId: string) => {
    setCompletingTasks((prev) => new Set(prev).add(taskId));

    setTimeout(() => {
      patchTask(taskId, { completed: true });

      setTasks(readTasks());
      setCompletingTasks((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 400);
  };

  const handleEditTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    
    patchTask(updatedTask.id, updatedTask);
    window.dispatchEvent(new Event("tasksUpdated"));
  };

  const handleTimerStateChange = (taskId: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  const handleOpenCanva = (task: Task) => {
    if (session) {
      toast({
        title: "Sessão em andamento",
        description: "Finalize a sessão atual antes de iniciar outra.",
        variant: "destructive",
      });
      return;
    }

    startSession(task);
    const popup = openCanvaPopout(task.canvaDesignUrl);
    
    if (popup) {
      toast({
        title: "Canva aberto!",
        description: "Use a barra de foco para controlar sua sessão.",
      });
    } else {
      toast({
        title: "Pop-up bloqueado",
        description: "Permita pop-ups para usar o Canva integrado.",
        variant: "destructive",
      });
    }
  };

  // Check if task should show Canva button
  const shouldShowCanvaButton = (task: Task) => {
    if (!settings.enabled) return false;
    if (settings.autoDetectCanvaTasks) {
      return task.isCanvaTask || isCanvaRelatedTask(task.text);
    }
    return task.isCanvaTask;
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
    <div className={`flex-1 bg-background flex flex-col relative ${session ? 'md:mr-64' : ''}`}>
      {/* Main content */}
      <div className="px-4 sm:px-6 py-6 flex-1">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-base font-medium">{getTitle()}</h1>
            <Button 
              onClick={() => setImportModalOpen(true)}
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3 w-3" />
              <span>Importar</span>
            </Button>
          </div>
          
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="pb-4"
          >
            <div className="flex gap-2 items-center">
              <Button
                onClick={addTask}
                size="icon"
                variant="ghost"
                className="shrink-0 h-7 w-7"
                aria-label="Adicionar tarefa"
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={cyclePriority}
                size="icon"
                variant="ghost"
                className="shrink-0 h-7 w-7 relative group"
                aria-label="Alternar prioridade"
              >
                <Star
                  className={`h-3.5 w-3.5 transition-colors ${
                    priority === 'alta'
                      ? 'fill-foreground text-foreground'
                      : priority === 'media'
                      ? 'fill-muted-foreground text-muted-foreground'
                      : 'text-muted-foreground'
                  }`}
                />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {priority === 'alta' ? 'Alta' : priority === 'media' ? 'Média' : 'Baixa'}
                </span>
              </Button>
              
              <TimePickerPopover 
                value={manualTime} 
                onChange={setManualTime} 
              />
              
              <DatePickerPopover 
                value={manualDate} 
                onChange={setManualDate} 
              />
              
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nova tarefa..."
                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm px-0 bg-transparent"
              />
            </div>
          </motion.div>

          {/* Tasks List */}
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {displayedTasks.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12"
                >
                  <p className="text-muted-foreground text-xs">
                    {filterMode === 'hoje' 
                      ? "Nenhuma tarefa para hoje" 
                      : "Nenhuma tarefa"
                    }
                  </p>
                </motion.div>
              ) : (
                displayedTasks.map((task, index) => (
                  task.type === 'study-block' ? (
                    <StudyBlockItem
                      key={task.id}
                      task={task}
                      index={index}
                      isCompleting={completingTasks.has(task.id)}
                      onComplete={() => completeStudyBlock(task.id)}
                      onTimerStateChange={(updates) => handleTimerStateChange(task.id, updates)}
                    />
                  ) : (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={
                      completingTasks.has(task.id)
                        ? {
                            opacity: 0,
                            scale: 0.9,
                            x: 100,
                            transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
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
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                    className="hover:bg-muted/50 rounded-sm transition-colors overflow-hidden group"
                  >
                    <div className="flex items-start gap-3 py-2 px-1">
                      <Checkbox
                        checked={completingTasks.has(task.id)}
                        onCheckedChange={() => completeTask(task.id)}
                        className="mt-0.5"
                      />
                      
                      <div
                        className={`w-0.5 h-full rounded-full self-stretch ${
                          task.priority === 'alta' 
                            ? 'bg-foreground' 
                            : task.priority === 'media'
                            ? 'bg-muted-foreground'
                            : 'bg-border'
                        }`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div 
                            className="flex items-center gap-2 flex-wrap flex-1 cursor-pointer"
                            onClick={() => navigate(`/tarefa/${task.id}`)}
                          >
                            <motion.p
                              animate={{
                                opacity: completingTasks.has(task.id) ? 0.4 : 1,
                              }}
                              className={`text-sm text-foreground leading-relaxed break-words hover:underline underline-offset-2 ${
                                completingTasks.has(task.id) ? "line-through opacity-40" : ""
                              }`}
                            >
                              {task.text}
                            </motion.p>
                            
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                                task.priority === 'alta'
                                  ? 'bg-foreground/10 text-foreground font-medium'
                                  : task.priority === 'media'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                            </span>

                            {/* Canva badge for linked tasks */}
                            {task.canvaDesignUrl && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                                Canva
                              </span>
                            )}
                            
                            {/* Arrow indicator for detail page */}
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {/* Canva Button */}
                            {shouldShowCanvaButton(task) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenCanva(task)}
                              >
                                <Palette className="h-3 w-3" />
                                <span className="text-[10px]">Canva</span>
                              </Button>
                            )}
                            
                            {/* Edit Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setEditingTask(task)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Task metadata row with smart date formatting */}
                        {(() => {
                          const dateInfo = formatTaskDate(task.dueDate);
                          return (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {/* Date badge - minimal */}
                              <div className={`flex items-center gap-1 text-[10px] ${
                                dateInfo.isOverdue 
                                  ? 'text-foreground font-medium' 
                                  : 'text-muted-foreground'
                              }`}>
                                <Calendar className="h-2.5 w-2.5" />
                                <span>{dateInfo.text}</span>
                                {dateInfo.isOverdue && (
                                  <span className="font-medium">• Atrasada</span>
                                )}
                              </div>
                              
                              {/* Time */}
                              {task.dueTime && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">•</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {task.dueTime}
                                  </span>
                                </>
                              )}
                              
                              {/* Course */}
                              {task.course && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">•</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {task.course}
                                  </span>
                                </>
                              )}
                              
                              {/* AVA source badge */}
                              {task.sourceType === 'ava' && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">•</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    AVA
                                  </span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </motion.div>
                  )
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-4 sm:py-6">
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

      <AddTaskDialog
        open={addTaskDialogOpen}
        onOpenChange={(open) => {
          setAddTaskDialogOpen(open);
          if (!open) setPrefilledTaskText('');
        }}
        defaultText={prefilledTaskText}
      />
    </div>
  );
};

export default NomosHome;
