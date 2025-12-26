import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Star, 
  MoreVertical, 
  Trash2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { useTaskBlocks } from '@/hooks/useTaskBlocks';
import { TaskBlockList } from '@/components/task/TaskBlockList';
import { toast } from '@/hooks/use-toast';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const {
    task,
    isLoading,
    isSynced,
    updateTask,
  } = useTaskDetail(id || '');

  // Use the Supabase ID for task blocks (UUID), not the URL id (which might be numeric from localStorage)
  const effectiveTaskId = task?.id;
  
  const {
    subtaskProgress,
    totalSubtasks,
  } = useTaskBlocks(effectiveTaskId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Tarefa não encontrada.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  const handleStartEditTitle = () => {
    setTitleValue(task.text);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    if (titleValue.trim() && titleValue !== task.text) {
      updateTask({ text: titleValue.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleComplete = () => {
    updateTask({ completed: !task.completed });
    if (!task.completed) {
      toast({
        title: '🎉 Tarefa concluída!',
        description: 'Parabéns por completar esta tarefa.',
      });
    }
  };

  const handleDelete = () => {
    // Delete from localStorage
    const STORAGE_KEY = 'nomos.tasks.today';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const tasks = JSON.parse(stored);
      const updated = tasks.filter((t: { id: string }) => t.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('tasksUpdated'));
    }
    
    toast({
      title: 'Tarefa excluída',
      description: 'A tarefa foi removida.',
    });
    navigate(-1);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Sem data';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'short',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'alta': return 'text-destructive';
      case 'media': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'alta': return 'Alta';
      case 'media': return 'Média';
      default: return 'Baixa';
    }
  };

  return (
    <div className="flex-1 bg-background min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>

          <div className="flex items-center gap-2">
            {!isSynced && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Modo local
              </span>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir tarefa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Task Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 mb-6"
        >
          {/* Title with checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              checked={task.completed}
              onCheckedChange={handleComplete}
              className="mt-1.5 h-5 w-5"
            />
            
            {isEditingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="text-xl font-semibold"
                autoFocus
              />
            ) : (
              <h1
                onClick={handleStartEditTitle}
                className={`text-xl font-semibold cursor-pointer hover:text-primary/80 transition-colors ${
                  task.completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.text}
              </h1>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap pl-8">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(task.dueDate)}</span>
            </div>
            
            {task.dueTime && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{task.dueTime}</span>
              </div>
            )}
            
            <div className={`flex items-center gap-1.5 ${getPriorityColor(task.priority)}`}>
              <Star className="h-4 w-4" />
              <span>{getPriorityLabel(task.priority)}</span>
            </div>
          </div>

          {/* Subtask progress (if any) */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-3 pl-8">
              <Progress value={subtaskProgress} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground font-medium">
                {subtaskProgress}%
              </span>
            </div>
          )}
        </motion.div>

        {/* Notion-style block list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {effectiveTaskId && <TaskBlockList taskId={effectiveTaskId} />}
        </motion.div>

        {/* Complete all suggestion */}
        {totalSubtasks > 0 && subtaskProgress === 100 && !task.completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/20 mt-8"
          >
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm text-foreground">
                Todas as subtarefas foram concluídas!
              </p>
              <Button onClick={handleComplete} className="gap-2">
                Concluir tarefa principal
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default TaskDetail;
