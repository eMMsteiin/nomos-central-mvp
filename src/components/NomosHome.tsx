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
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "nomos.tasks.today";

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

  // Listen for tasksUpdated event to reload tasks from localStorage
  useEffect(() => {
    const handleTasksUpdated = () => {
      console.log('[NomosHome] Evento tasksUpdated recebido!');
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('[NomosHome] localStorage raw (primeiros 500 chars):', stored?.substring(0, 500));
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const studyBlocks = parsed.filter((t: Task) => t.type === 'study-block');
          console.log('[NomosHome] Tasks carregadas:', parsed.length, '| Study blocks:', studyBlocks.length);
          console.log('[NomosHome] Study blocks encontrados:', studyBlocks);
          setTasks(parsed);
        } catch (e) {
          console.error("[NomosHome] Erro ao parsear tasks:", e);
        }
      }
    };

    window.addEventListener('tasksUpdated', handleTasksUpdated);
    return () => window.removeEventListener('tasksUpdated', handleTasksUpdated);
  }, []);

  // Save tasks to localStorage whenever they change (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

      // Gerar UUID para consistência com Supabase
      const taskId = crypto.randomUUID();
      const deviceId = localStorage.getItem('nomos.device.id') || 'device_' + crypto.randomUUID();
      
      // Salvar deviceId se não existir
      if (!localStorage.getItem('nomos.device.id')) {
        localStorage.setItem('nomos.device.id', deviceId);
      }

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

      // Persistir localmente primeiro
      const storedTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const nextTasks = [newTask, ...storedTasks];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));

      setTasks(nextTasks);
      setInputValue("");
      setPriority('baixa');
      setManualTime(undefined);
      setManualDate(undefined);

      window.dispatchEvent(new Event('tasksUpdated'));

      // Sincronizar com Supabase imediatamente (em background)
      try {
        await supabase.from('tasks').insert({
          id: taskId,
          device_id: deviceId,
          text: cleanText,
          due_date: finalDate ? new Date(finalDate).toISOString() : null,
          due_time: finalTime || null,
          priority: priority,
          category: finalCategory,
          source_type: 'manual',
          completed: false,
          is_canva_task: isCanvaRelatedTask(cleanText),
        });
      } catch (err) {
        console.error('Erro ao sincronizar tarefa com Supabase:', err);
      }
    } finally {
      isCreatingTask.current = false;
    }
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
      isCanvaTask: isCanvaRelatedTask(event.title),
    }));

    const storedTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const nextTasks = [...importedTasks, ...storedTasks];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));

    setTasks(nextTasks);
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
      // Persistir ANTES de atualizar state
      const storedTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const nextTasks = storedTasks.filter((t) => t.id !== taskId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));

      setTasks(nextTasks);
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
      // Persistir ANTES de atualizar state
      const storedTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const nextTasks = storedTasks.map((t) => 
        t.id === taskId ? { ...t, completed: true } : t
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks));

      setTasks(nextTasks);
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
    
    const allTasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = allTasks.map((t: Task) =>
      t.id === updatedTask.id ? updatedTask : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
      <div className="px-4 sm:px-6 py-6 sm:py-8 md:py-12 flex-1">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold">{getTitle()}</h1>
            <Button 
              onClick={() => setImportModalOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              <span className="sm:inline">Importar do AVA</span>
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
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                    exit={{ opacity: 0, scale: 0.9, x: 100, transition: { duration: 0.3 } }}
                    className="hover:bg-muted/20 rounded-lg transition-all duration-200 overflow-hidden group"
                  >
                    <div className="flex items-start gap-3 py-2 px-1">
                      <Checkbox
                        checked={completingTasks.has(task.id)}
                        onCheckedChange={() => completeTask(task.id)}
                        className="mt-0.5"
                      />
                      
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
                          <div 
                            className="flex items-center gap-2 flex-wrap flex-1 cursor-pointer"
                            onClick={() => navigate(`/tarefa/${task.id}`)}
                          >
                            <motion.p
                              animate={{
                                opacity: completingTasks.has(task.id) ? 0.4 : 1,
                              }}
                              className={`text-sm text-foreground leading-relaxed break-words hover:text-primary transition-colors ${
                                completingTasks.has(task.id) ? "line-through" : ""
                              }`}
                            >
                              {task.text}
                            </motion.p>
                            
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

                            {/* Canva badge for linked tasks */}
                            {task.canvaDesignUrl && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                Canva
                              </span>
                            )}
                            
                            {/* Arrow indicator for detail page */}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {/* Canva Button */}
                            {shouldShowCanvaButton(task) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity gap-1 text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                                onClick={() => handleOpenCanva(task)}
                              >
                                <Palette className="h-3 w-3" />
                                <span className="text-xs">Canva</span>
                              </Button>
                            )}
                            
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
                        </div>
                        
                        {/* Task metadata row with smart date formatting */}
                        {(() => {
                          const dateInfo = formatTaskDate(task.dueDate);
                          return (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {/* Date badge with dynamic colors */}
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${
                                dateInfo.isOverdue 
                                  ? 'bg-destructive/10' 
                                  : dateInfo.isToday 
                                  ? 'bg-primary/10' 
                                  : dateInfo.isTomorrow 
                                  ? 'bg-blue-500/10' 
                                  : 'bg-muted'
                              }`}>
                                {dateInfo.isOverdue ? (
                                  <AlertCircle className="h-3 w-3 text-destructive" />
                                ) : (
                                  <Calendar className={`h-3 w-3 ${
                                    dateInfo.isToday 
                                      ? 'text-primary' 
                                      : dateInfo.isTomorrow 
                                      ? 'text-blue-500' 
                                      : 'text-muted-foreground'
                                  }`} />
                                )}
                                <span className={`text-xs font-medium ${
                                  dateInfo.isOverdue 
                                    ? 'text-destructive' 
                                    : dateInfo.isToday 
                                    ? 'text-primary' 
                                    : dateInfo.isTomorrow 
                                    ? 'text-blue-500' 
                                    : 'text-muted-foreground'
                                }`}>
                                  {dateInfo.text}
                                </span>
                                {dateInfo.isOverdue && (
                                  <span className="text-[10px] text-destructive font-medium">
                                    Atrasada
                                  </span>
                                )}
                              </div>
                              
                              {/* Time */}
                              {task.dueTime && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {task.dueTime}
                                    </span>
                                  </div>
                                </>
                              )}
                              
                              {/* Course */}
                              {task.course && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                                    {task.course}
                                  </span>
                                </>
                              )}
                              
                              {/* AVA source badge */}
                              {task.sourceType === 'ava' && (
                                <>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
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
