import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/types/task";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon, Clock, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { PostItOverlay } from "@/components/PostItOverlay";

const STORAGE_KEY = "nomos.tasks.today";

const EmBreve = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  useEffect(() => {
    const loadTasks = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const allTasks: Task[] = JSON.parse(stored);
        
        // Filtrar apenas tarefas futuras (> 7 dias) e não completas
        const futureTasks = allTasks.filter(t => 
          !t.completed && t.category === 'em-breve'
        );
        
        setTasks(futureTasks);
      }
    };

    loadTasks();
    
    // Listen for updates
    window.addEventListener("tasksUpdated", loadTasks);
    return () => window.removeEventListener("tasksUpdated", loadTasks);
  }, []);
  
  // Agrupar tarefas por data
  const tasksByDate = tasks.reduce((acc, task) => {
    if (!task.dueDate) return acc;
    
    const dateKey = new Date(task.dueDate).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    
    return acc;
  }, {} as Record<string, Task[]>);
  
  // Tarefas do dia selecionado
  const selectedDateTasks = selectedDate 
    ? tasksByDate[selectedDate.toDateString()] || []
    : [];
  
  // Modificador de datas com tarefas
  const datesWithTasks = Object.keys(tasksByDate).map(dateStr => new Date(dateStr));
  
  const completeTask = (taskId: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allTasks: Task[] = JSON.parse(stored);
      const updated = allTasks.map(t => 
        t.id === taskId ? { ...t, completed: true } : t
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTasks(updated.filter(t => !t.completed && t.category === 'em-breve'));
      window.dispatchEvent(new Event('tasksUpdated'));
    }
  };

  const handleEditTask = (updatedTask: Task) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const allTasks: Task[] = JSON.parse(stored);
      const updated = allTasks.map(t => 
        t.id === updatedTask.id ? updatedTask : t
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setTasks(updated.filter(t => !t.completed && t.category === 'em-breve'));
      window.dispatchEvent(new Event('tasksUpdated'));
    }
  };
  
  return (
    <div className="px-6 py-8 relative">
      <PostItOverlay tab="em-breve" />
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-2">
          <CalendarIcon className="h-8 w-8" />
          Calendário de Tarefas Futuras
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Selecione uma data</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasTasks: datesWithTasks
                }}
                modifiersClassNames={{
                  hasTasks: "font-bold text-primary underline"
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>
          
          {/* Lista de tarefas do dia selecionado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate 
                  ? selectedDate.toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Selecione uma data'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhuma tarefa para este dia
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group border-l-4"
                      style={{
                        borderLeftColor: 
                          task.priority === 'alta' 
                            ? 'hsl(var(--destructive))' 
                            : task.priority === 'media'
                            ? 'hsl(var(--primary))'
                            : 'hsl(var(--secondary))'
                      }}
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => completeTask(task.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium break-words">{task.text}</p>
                            
                            {task.dueTime && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.dueTime}
                              </span>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setEditingTask(task)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-1">
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
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Estatísticas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {tasks.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tarefas futuras
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {Object.keys(tasksByDate).length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Dias com tarefas
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {selectedDateTasks.length}
                </p>
                <p className="text-sm text-muted-foreground">
                  Tarefas neste dia
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

export default EmBreve;
