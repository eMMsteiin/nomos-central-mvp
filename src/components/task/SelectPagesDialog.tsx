import { useState, useEffect, useMemo } from 'react';
import { Book, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Notebook } from '@/types/notebook';
import { renderPageToCanvas } from '@/utils/notebookExport';

interface SelectPagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebook: Notebook | null;
  onConfirm: (notebook: Notebook, pageIndexes: number[]) => void;
  isProcessing?: boolean;
}

export function SelectPagesDialog({
  open,
  onOpenChange,
  notebook,
  onConfirm,
  isProcessing = false,
}: SelectPagesDialogProps) {
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);

  // Reset selection when dialog opens/closes or notebook changes
  useEffect(() => {
    if (open && notebook) {
      setSelectedPages(new Set());
      setThumbnails(new Map());
      loadThumbnails();
    }
  }, [open, notebook?.id]);

  const loadThumbnails = async () => {
    if (!notebook || notebook.pages.length === 0) return;
    
    setIsLoadingThumbnails(true);
    const newThumbnails = new Map<number, string>();

    // Load thumbnails with lower DPR for performance
    for (let i = 0; i < notebook.pages.length; i++) {
      try {
        const dataUrl = await renderPageToCanvas(notebook.pages[i], 0.25);
        newThumbnails.set(i, dataUrl);
        setThumbnails(new Map(newThumbnails));
      } catch (error) {
        console.error(`Error rendering thumbnail for page ${i}:`, error);
      }
    }
    
    setIsLoadingThumbnails(false);
  };

  const togglePage = (index: number) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPages(newSelected);
  };

  const toggleAll = () => {
    if (!notebook) return;
    
    if (selectedPages.size === notebook.pages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(notebook.pages.map((_, i) => i)));
    }
  };

  const handleConfirm = () => {
    if (!notebook || selectedPages.size === 0) return;
    onConfirm(notebook, Array.from(selectedPages).sort((a, b) => a - b));
  };

  const allSelected = notebook && selectedPages.size === notebook.pages.length;

  if (!notebook) return null;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
              style={{ backgroundColor: notebook.color }}
            >
              <Book className="h-4 w-4 text-white" />
            </div>
            Selecionar Páginas - {notebook.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <p className="text-sm text-muted-foreground">
            {selectedPages.size > 0 
              ? `${selectedPages.size} página${selectedPages.size !== 1 ? 's' : ''} selecionada${selectedPages.size !== 1 ? 's' : ''}`
              : 'Selecione as páginas que deseja anexar'
            }
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            disabled={isProcessing}
          >
            {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {notebook.pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Book className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">Este caderno não tem páginas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
              {notebook.pages.map((page, index) => {
                const isSelected = selectedPages.has(index);
                const thumbnail = thumbnails.get(index);

                return (
                  <button
                    key={page.id}
                    onClick={() => !isProcessing && togglePage(index)}
                    disabled={isProcessing}
                    className={`
                      relative aspect-[2/3] rounded-lg border-2 overflow-hidden transition-all
                      ${isSelected 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                      }
                      ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Thumbnail */}
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={`Página ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        {isLoadingThumbnails ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Página {index + 1}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Selection indicator */}
                    <div className={`
                      absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center
                      transition-colors
                      ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80 border border-border'}
                    `}>
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>

                    {/* Page number */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-background/80 rounded text-xs font-medium">
                      {index + 1}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedPages.size === 0 || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Anexar ${selectedPages.size} página${selectedPages.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
