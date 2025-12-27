import { useState, useMemo } from 'react';
import { Book, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotebooks } from '@/hooks/useNotebooks';
import { Notebook } from '@/types/notebook';
import { SelectNotebookAttachModeDialog } from './SelectNotebookAttachModeDialog';
import { SelectPagesDialog } from './SelectPagesDialog';

interface SelectNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNotebook: (notebook: Notebook) => void;
  onSelectPagesAsImages: (notebook: Notebook, pageIndexes: number[]) => void;
  isProcessingPages?: boolean;
}

export function SelectNotebookDialog({
  open,
  onOpenChange,
  onSelectNotebook,
  onSelectPagesAsImages,
  isProcessingPages = false,
}: SelectNotebookDialogProps) {
  const { notebooks } = useNotebooks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [showPagesDialog, setShowPagesDialog] = useState(false);

  const filteredNotebooks = useMemo(() => {
    if (!searchQuery.trim()) return notebooks;
    const query = searchQuery.toLowerCase();
    return notebooks.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.discipline?.toLowerCase().includes(query)
    );
  }, [notebooks, searchQuery]);

  // Group by discipline
  const groupedNotebooks = useMemo(() => {
    const groups: Record<string, Notebook[]> = {};
    filteredNotebooks.forEach((notebook) => {
      const key = notebook.discipline || 'Sem disciplina';
      if (!groups[key]) groups[key] = [];
      groups[key].push(notebook);
    });
    return groups;
  }, [filteredNotebooks]);

  const handleNotebookClick = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setShowModeDialog(true);
  };

  const handleAttachNotebook = (notebook: Notebook) => {
    onSelectNotebook(notebook);
    onOpenChange(false);
    setSearchQuery('');
    setSelectedNotebook(null);
  };

  const handleAttachPagesAsImages = (notebook: Notebook) => {
    setShowModeDialog(false);
    setShowPagesDialog(true);
  };

  const handlePagesConfirm = (notebook: Notebook, pageIndexes: number[]) => {
    onSelectPagesAsImages(notebook, pageIndexes);
    // Don't close dialogs here - let parent handle it after processing
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setSearchQuery('');
      setSelectedNotebook(null);
      setShowModeDialog(false);
      setShowPagesDialog(false);
    }
    onOpenChange(newOpen);
  };

  // Close pages dialog when processing is done
  const handlePagesDialogClose = (newOpen: boolean) => {
    if (!newOpen && !isProcessingPages) {
      setShowPagesDialog(false);
      setSelectedNotebook(null);
      onOpenChange(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <Dialog open={open && !showModeDialog && !showPagesDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Selecionar Caderno
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou disciplina..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Notebook list */}
          <ScrollArea className="h-[300px] -mx-6 px-6">
            {filteredNotebooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Book className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">
                  {notebooks.length === 0
                    ? 'Nenhum caderno criado ainda'
                    : 'Nenhum caderno encontrado'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedNotebooks).map(([discipline, notebooksInGroup]) => (
                  <div key={discipline}>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      {discipline}
                    </p>
                    <div className="space-y-1">
                      {notebooksInGroup.map((notebook) => (
                        <button
                          key={notebook.id}
                          onClick={() => handleNotebookClick(notebook)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                        >
                          <div
                            className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                            style={{ backgroundColor: notebook.color }}
                          >
                            <Book className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{notebook.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {notebook.pages.length} página{notebook.pages.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Mode selection dialog */}
      <SelectNotebookAttachModeDialog
        open={showModeDialog}
        onOpenChange={setShowModeDialog}
        notebook={selectedNotebook}
        onAttachNotebook={handleAttachNotebook}
        onAttachPagesAsImages={handleAttachPagesAsImages}
      />

      {/* Page selection dialog */}
      <SelectPagesDialog
        open={showPagesDialog}
        onOpenChange={handlePagesDialogClose}
        notebook={selectedNotebook}
        onConfirm={handlePagesConfirm}
        isProcessing={isProcessingPages}
      />
    </>
  );
}
