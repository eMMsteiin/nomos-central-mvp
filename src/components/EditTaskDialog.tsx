import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Task } from '@/types/task';
import { Clock } from 'lucide-react';
import starIcon from "@/assets/star-priority.avif";

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
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  if (priority === 'baixa') setPriority('media');
                  else if (priority === 'media') setPriority('alta');
                  else setPriority('baixa');
                }}
                size="icon"
                variant="outline"
                className="h-12 w-12"
              >
                <img
                  src={starIcon}
                  alt="Prioridade"
                  className={`h-6 w-6 transition-all duration-300 ${
                    priority === 'alta'
                      ? 'brightness-[0.4] hue-rotate-[-15deg] saturate-150'
                      : priority === 'media'
                      ? 'brightness-[0.6] hue-rotate-[180deg] saturate-150'
                      : 'brightness-[0.5] hue-rotate-[60deg] saturate-150'
                  }`}
                />
              </Button>
              
              <div className="text-sm">
                <p className="font-medium">
                  {priority === 'alta' ? 'Alta Prioridade' : priority === 'media' ? 'Média Prioridade' : 'Baixa Prioridade'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Clique na estrela para alternar
                </p>
              </div>
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
