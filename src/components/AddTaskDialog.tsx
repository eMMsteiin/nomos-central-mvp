import { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task } from '@/types/task';
import { extractTimeFromText } from '@/services/timeExtractor';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "nomos-tasks";

export function AddTaskDialog({ open, onOpenChange }: AddTaskDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('baixa');

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
      category: 'entrada',
    };

    // Get existing tasks from localStorage
    const existingTasks = localStorage.getItem(STORAGE_KEY);
    const tasks: Task[] = existingTasks ? JSON.parse(existingTasks) : [];
    
    // Add new task
    const updatedTasks = [newTask, ...tasks];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTasks));

    // Dispatch event to notify other components
    window.dispatchEvent(new Event('tasksUpdated'));

    // Reset form
    setInputValue("");
    setPriority('baixa');
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTask();
    }
  };

  const togglePriority = () => {
    setPriority((prev) => {
      if (prev === 'baixa') return 'media';
      if (prev === 'media') return 'alta';
      return 'baixa';
    });
  };

  const getPriorityColor = () => {
    if (priority === 'alta') return 'text-[hsl(var(--todoist-red))]';
    if (priority === 'media') return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar tarefa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex gap-3 items-center">
            <Button
              onClick={togglePriority}
              size="icon"
              variant="ghost"
              className="shrink-0 h-8 w-8"
              aria-label="Definir prioridade"
            >
              <Star 
                className={`h-5 w-5 transition-colors ${getPriorityColor()}`}
                fill={priority !== 'baixa' ? 'currentColor' : 'none'}
              />
            </Button>

            <Input
              type="text"
              placeholder="Nome da tarefa"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
              autoFocus
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 Dica: Use horários no texto para definir lembretes automáticos</p>
            <p className="text-[10px]">Exemplos: "às 14h", "14:30", "amanhã às 10h"</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setInputValue("");
              setPriority('baixa');
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={addTask}
            disabled={!inputValue.trim()}
            className="bg-[hsl(var(--todoist-red))] hover:bg-[hsl(var(--todoist-red-hover))] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar tarefa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
