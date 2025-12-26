import { useState } from 'react';
import { Star, Plus, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';
import { TimePickerPopover } from '@/components/task/TimePickerPopover';
import { DatePickerPopover } from '@/components/task/DatePickerPopover';

interface ConvertToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotationText: string;
}

export function ConvertToTaskDialog({ open, onOpenChange, annotationText }: ConvertToTaskDialogProps) {
  // Título sugerido: primeira linha ou primeiros 50 caracteres
  const suggestedTitle = annotationText.split('\n')[0].slice(0, 50) || 'Nova tarefa';
  
  const [title, setTitle] = useState(suggestedTitle);
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('baixa');
  const [time, setTime] = useState<string | undefined>();
  const [date, setDate] = useState<Date | undefined>();
  const [destination, setDestination] = useState<'hoje' | 'entrada'>('entrada');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Reset state when dialog opens with new annotation
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(annotationText.split('\n')[0].slice(0, 50) || 'Nova tarefa');
      setPriority('baixa');
      setTime(undefined);
      setDate(undefined);
      setDestination('entrada');
    }
    onOpenChange(newOpen);
  };

  const createTask = () => {
    const newTask: Task = {
      id: Date.now().toString(),
      text: title,
      description: annotationText,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dueTime: time,
      dueDate: date,
      priority,
      sourceType: 'manual',
      category: destination,
    };

    // Salvar no localStorage
    const STORAGE_KEY = 'nomos.tasks.today';
    const existing = localStorage.getItem(STORAGE_KEY);
    const tasks: Task[] = existing ? JSON.parse(existing) : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newTask, ...tasks]));
    
    // Notificar outros componentes
    window.dispatchEvent(new Event('tasksUpdated'));

    const destinationPath = destination === 'hoje' ? '/hoje' : '/';

    // Toast de sucesso
    toast({
      title: '✅ Anotação convertida em tarefa!',
      description: `Adicionada em "${destination === 'hoje' ? 'Hoje' : 'Entrada'}"`,
      action: (
        <Button variant="outline" size="sm" onClick={() => navigate(destinationPath)}>
          Ver tarefa
        </Button>
      ),
    });

    onOpenChange(false);
  };

  const getPriorityColor = (p: 'alta' | 'media' | 'baixa') => {
    switch (p) {
      case 'alta':
        return 'fill-destructive text-destructive';
      case 'media':
        return 'fill-primary text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  const cyclePriority = () => {
    setPriority(p => p === 'baixa' ? 'media' : p === 'media' ? 'alta' : 'baixa');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Transformar em Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input do título */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa"
            className="font-medium"
          />

          {/* Linha com prioridade, horário e data */}
          <div className="flex items-center gap-2">
            {/* Prioridade */}
            <Button
              onClick={cyclePriority}
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              title={`Prioridade: ${priority}`}
            >
              <Star className={`h-5 w-5 ${getPriorityColor(priority)}`} />
            </Button>

            <TimePickerPopover value={time} onChange={setTime} />
            <DatePickerPopover value={date} onChange={setDate} />
          </div>

          {/* Seletor de destino */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Adicionar em:</p>
            <div className="flex gap-2">
              <Button
                variant={destination === 'hoje' ? 'default' : 'outline'}
                onClick={() => setDestination('hoje')}
                className="flex-1"
                size="sm"
              >
                📅 Hoje
              </Button>
              <Button
                variant={destination === 'entrada' ? 'default' : 'outline'}
                onClick={() => setDestination('entrada')}
                className="flex-1"
                size="sm"
              >
                📥 Entrada
              </Button>
            </div>
          </div>

          {/* Preview da anotação original */}
          {annotationText && (
            <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground max-h-24 overflow-y-auto">
              <p className="text-xs font-medium mb-1">Anotação original:</p>
              <p className="whitespace-pre-wrap">{annotationText}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={createTask} disabled={!title.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Tarefa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
