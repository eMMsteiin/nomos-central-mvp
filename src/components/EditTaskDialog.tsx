import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/task';
import { Clock } from 'lucide-react';

interface Props {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTask: Task) => void;
}

export function EditTaskDialog({ task, open, onOpenChange, onSave }: Props) {
  const [dueTime, setDueTime] = useState(task.dueTime || '');
  const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>(task.priority || 'media');

  const handleSave = () => {
    onSave({
      ...task,
      dueTime: dueTime.trim() || undefined,
      priority,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horário
            </Label>
            <Input
              id="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              placeholder="Ex: 14:30, 09:00"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Digite no formato HH:MM (ex: 14:30)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={priority === 'alta' ? 'default' : 'outline'}
                onClick={() => setPriority('alta')}
                className={priority === 'alta' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
              >
                🔴 Alta
              </Button>
              <Button
                size="sm"
                variant={priority === 'media' ? 'default' : 'outline'}
                onClick={() => setPriority('media')}
                className={priority === 'media' ? 'bg-primary hover:bg-primary/90' : ''}
              >
                🔵 Média
              </Button>
              <Button
                size="sm"
                variant={priority === 'baixa' ? 'default' : 'outline'}
                onClick={() => setPriority('baixa')}
                className={priority === 'baixa' ? 'bg-secondary hover:bg-secondary/90' : ''}
              >
                🟢 Baixa
              </Button>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
