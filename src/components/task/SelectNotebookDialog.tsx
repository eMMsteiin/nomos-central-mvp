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

interface SelectNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (notebook: Notebook) => void;
}

export function SelectNotebookDialog({
  open,
  onOpenChange,
  onSelect,
}: SelectNotebookDialogProps) {
  const { notebooks } = useNotebooks();
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSelect = (notebook: Notebook) => {
    onSelect(notebook);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                        onClick={() => handleSelect(notebook)}
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
  );
}
