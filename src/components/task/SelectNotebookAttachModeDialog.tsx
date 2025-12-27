import { Book, Image } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Notebook } from '@/types/notebook';

interface SelectNotebookAttachModeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook: Notebook | null;
  onAttachNotebook: (notebook: Notebook) => void;
  onAttachPagesAsImages: (notebook: Notebook) => void;
}

export function SelectNotebookAttachModeDialog({
  open,
  onOpenChange,
  notebook,
  onAttachNotebook,
  onAttachPagesAsImages,
}: SelectNotebookAttachModeDialogProps) {
  if (!notebook) return null;

  const handleAttachNotebook = () => {
    onAttachNotebook(notebook);
    onOpenChange(false);
  };

  const handleAttachPages = () => {
    onAttachPagesAsImages(notebook);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ backgroundColor: notebook.color }}
            >
              <Book className="h-4 w-4 text-white" />
            </div>
            {notebook.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            Como deseja anexar este caderno à tarefa?
          </p>

          <div className="grid gap-3">
            {/* Option 1: Attach entire notebook */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={handleAttachNotebook}
            >
              <div className="flex items-center gap-2 font-medium">
                <Book className="h-5 w-5 text-primary" />
                Vincular Caderno
              </div>
              <p className="text-xs text-muted-foreground font-normal">
                Adiciona um link para o caderno inteiro. Alterações no caderno serão refletidas aqui.
              </p>
            </Button>

            {/* Option 2: Attach pages as images */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2 text-left"
              onClick={handleAttachPages}
              disabled={notebook.pages.length === 0}
            >
              <div className="flex items-center gap-2 font-medium">
                <Image className="h-5 w-5 text-primary" />
                Anexar Páginas como Imagem
              </div>
              <p className="text-xs text-muted-foreground font-normal">
                Selecione páginas específicas para anexar como imagens estáticas.
                {notebook.pages.length === 0 && ' (Caderno sem páginas)'}
              </p>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
