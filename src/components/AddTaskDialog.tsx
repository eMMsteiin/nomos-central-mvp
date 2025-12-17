import { useState, useEffect } from 'react';
import { Plus, Star, Calendar } from 'lucide-react';
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
import { extractDateFromText, formatDetectedDate } from '@/services/dateExtractor';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultText?: string;
}

const STORAGE_KEY = "nomos.tasks.today";

export function AddTaskDialog({ open, onOpenChange, defaultText = '' }: AddTaskDialogProps) {
  const [inputValue, setInputValue] = useState(defaultText);
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('baixa');

  // Update input when defaultText changes
  useEffect(() => {
    if (defaultText) {
      setInputValue(defaultText);
    }
  }, [defaultText]);

  const addTask = () => {
    if (!inputValue.trim()) return;

    // Primeiro extrair data
    const { cleanText: textWithoutDate, detectedDate, category } = extractDateFromText(inputValue.trim());
    
    // Depois extrair horário do texto restante
    const { cleanText, time } = extractTimeFromText(textWithoutDate);

    const newTask: Task = {
      id: Date.now().toString(),
      text: cleanText,
      createdAt: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dueTime: time,
      dueDate: detectedDate,
      priority: priority,
      sourceType: 'manual',
      category: category,
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
    if (priority === 'alta') return 'fill-destructive text-destructive';
    if (priority === 'media') return 'fill-primary text-primary';
    return 'fill-secondary text-secondary';
  };

  // Extrair data e horário para preview
  const { detectedDate, category } = extractDateFromText(inputValue);
  const { time: detectedTime } = extractTimeFromText(inputValue);
  
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
              className="shrink-0 h-8 w-8 relative group"
              aria-label="Definir prioridade"
            >
              <Star 
                className={`h-5 w-5 transition-all duration-300 ${getPriorityColor()}`}
              />
              
              {/* Tooltip minimalista */}
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {priority === 'alta' ? 'Alta' : priority === 'media' ? 'Média' : 'Baixa'}
              </span>
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

          {/* Preview de data e horário detectados */}
          {(detectedDate || detectedTime) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
              <Calendar className="h-4 w-4" />
              <span>
                {detectedDate && formatDetectedDate(detectedDate)}
                {detectedDate && detectedTime && ' • '}
                {detectedTime && `🕐 ${detectedTime}`}
                <span className="ml-2 font-medium">
                  → {category === 'hoje' ? 'Hoje' : category === 'em-breve' ? 'Em breve' : 'Entrada'}
                </span>
              </span>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 Dica: Use datas e horários para organizar automaticamente</p>
            <p className="text-[10px]">Exemplos: "Jogar bola 11:10 22/12", "Reunião 15h amanhã", "Estudar 14h30 25/12"</p>
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
