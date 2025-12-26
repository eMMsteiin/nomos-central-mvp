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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTaskDetail } from '@/hooks/useTaskDetail';
import { SubtaskList } from '@/components/task/SubtaskList';
import { AttachmentGrid } from '@/components/task/AttachmentGrid';
import { toast } from '@/hooks/use-toast';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const {
    task,
    subtasks,
    attachments,
    isLoading,
    isSynced,
    subtaskProgress,
    updateTask,
    addSubtask,
    toggleSubtask,
    updateSubtaskText,
    deleteSubtask,
    reorderSubtasks,
    uploadAttachment,
    deleteAttachment,
  } = useTaskDetail(id || '');

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

  const handleStartEditDescription = () => {
    setDescriptionValue(task.description || '');
    setIsEditingDescription(true);
  };

  const handleSaveDescription = () => {
    updateTask({ description: descriptionValue.trim() || undefined });
    setIsEditingDescription(false);
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

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await uploadAttachment(file);
      toast({
        title: 'Anexo adicionado',
        description: `${file.name} foi anexado à tarefa.`,
      });
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível anexar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
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
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Task Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
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
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
          {subtasks.length > 0 && (
            <div className="flex items-center gap-3">
              <Progress value={subtaskProgress} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground font-medium">
                {subtaskProgress}%
              </span>
            </div>
          )}
        </motion.div>

        <Separator />

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <h3 className="font-medium text-foreground">Descrição</h3>
          
          {isEditingDescription ? (
            <div className="space-y-2">
              <Textarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                placeholder="Adicione uma descrição..."
                className="min-h-[100px]"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription}>
                  Salvar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditingDescription(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={handleStartEditDescription}
              className="min-h-[60px] p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors"
            >
              {task.description ? (
                <p className="text-foreground whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Clique para adicionar uma descrição...
                </p>
              )}
            </div>
          )}
        </motion.div>

        <Separator />

        {/* Subtasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SubtaskList
            subtasks={subtasks}
            onAdd={addSubtask}
            onToggle={toggleSubtask}
            onUpdateText={updateSubtaskText}
            onDelete={deleteSubtask}
            onReorder={reorderSubtasks}
          />
        </motion.div>

        <Separator />

        {/* Attachments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AttachmentGrid
            attachments={attachments}
            onUpload={handleUpload}
            onDelete={deleteAttachment}
            isUploading={isUploading}
          />
        </motion.div>

        {/* Complete all suggestion */}
        {subtasks.length > 0 && subtaskProgress === 100 && !task.completed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center p-4 bg-primary/5 rounded-lg border border-primary/20"
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
