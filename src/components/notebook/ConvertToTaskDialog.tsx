import { useState, useEffect } from 'react';
import { Star, Plus, CheckSquare, Sparkles, Loader2 } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface ConvertToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotationText: string;
}

export function ConvertToTaskDialog({ open, onOpenChange, annotationText }: ConvertToTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('baixa');
  const [time, setTime] = useState<string | undefined>();
  const [date, setDate] = useState<Date | undefined>();
  const [destinations, setDestinations] = useState<Array<'hoje' | 'entrada'>>(['entrada']);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Gerar título inteligente quando o dialog abrir
  useEffect(() => {
    if (open && annotationText) {
      generateSmartTitle();
    }
  }, [open, annotationText]);

  const generateSmartTitle = async () => {
    setIsGeneratingTitle(true);
    
    // Fallback imediato enquanto carrega
    const fallbackTitle = annotationText.split('\n')[0].slice(0, 40) || 'Nova tarefa';
    setTitle(fallbackTitle);

    try {
      const { data, error } = await supabase.functions.invoke('generate-task-title', {
        body: { annotationText }
      });

      if (!error && data?.title) {
        setTitle(data.title);
      }
    } catch (error) {
      console.error('Error generating title:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setPriority('baixa');
      setTime(undefined);
      setDate(undefined);
      setDestinations(['entrada']);
    }
    onOpenChange(newOpen);
  };

  const toggleDestination = (dest: 'hoje' | 'entrada') => {
    setDestinations(prev => {
      if (prev.includes(dest)) {
        // Se já está selecionado e é o único, não remove
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dest);
      } else {
        return [...prev, dest];
      }
    });
  };

  const createTask = () => {
    const STORAGE_KEY = 'nomos.tasks.today';
    const existing = localStorage.getItem(STORAGE_KEY);
    const tasks: Task[] = existing ? JSON.parse(existing) : [];

    // Criar uma tarefa para cada destino selecionado
    const newTasks: Task[] = destinations.map((dest, index) => ({
      id: `${Date.now()}-${index}`,
      text: title,
      description: annotationText,
      createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dueTime: time,
      dueDate: date,
      priority,
      sourceType: 'manual' as const,
      category: dest,
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...newTasks, ...tasks]));
    window.dispatchEvent(new Event('tasksUpdated'));

    const destText = destinations.length === 2 
      ? 'Hoje e Entrada' 
      : destinations[0] === 'hoje' ? 'Hoje' : 'Entrada';

    toast({
      title: '✅ Anotação convertida em tarefa!',
      description: `Adicionada em "${destText}"`,
      action: destinations.length === 1 ? (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate(destinations[0] === 'hoje' ? '/hoje' : '/')}
        >
          Ver tarefa
        </Button>
      ) : undefined,
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
          {/* Input do título com indicador de IA */}
          <div className="space-y-1.5">
            <div className="relative">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da tarefa"
                className="font-medium pr-10"
              />
              {isGeneratingTitle ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              {isGeneratingTitle ? 'Gerando título inteligente...' : 'Título sugerido pela IA • edite se desejar'}
            </p>
          </div>

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

          {/* Seletor de destino - múltipla escolha */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Adicionar em:</p>
            <div className="flex gap-2">
              <Button
                variant={destinations.includes('hoje') ? 'default' : 'outline'}
                onClick={() => toggleDestination('hoje')}
                className="flex-1"
                size="sm"
              >
                {destinations.includes('hoje') && '✓ '}📅 Hoje
              </Button>
              <Button
                variant={destinations.includes('entrada') ? 'default' : 'outline'}
                onClick={() => toggleDestination('entrada')}
                className="flex-1"
                size="sm"
              >
                {destinations.includes('entrada') && '✓ '}📥 Entrada
              </Button>
            </div>
            {destinations.length === 2 && (
              <p className="text-xs text-muted-foreground">
                A tarefa será adicionada em ambas as abas
              </p>
            )}
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
