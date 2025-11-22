import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBlock: (title: string) => void;
}

export const CreateBlockDialog = ({ open, onOpenChange, onCreateBlock }: CreateBlockDialogProps) => {
  const [title, setTitle] = useState('');

  const handleCreate = () => {
    onCreateBlock(title);
    setTitle('');
    onOpenChange(false);
  };

  const getDefaultTitle = () => {
    const now = new Date();
    return `Semana de ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Bloco Semanal</DialogTitle>
          <DialogDescription>
            Crie um bloco para organizar seus lembretes por semana. Você pode expandir em dias depois.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título da Semana</Label>
            <Input
              id="title"
              placeholder={getDefaultTitle()}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate}>
            Criar Bloco
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
