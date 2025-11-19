import { useState } from 'react';
import { useNotebooks } from '@/hooks/useNotebooks';
import { NotebookCanvas } from '@/components/NotebookCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Book, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Notebook } from '@/types/notebook';

const Caderno = () => {
  const { notebooks, createNotebook, deleteNotebook, updateNotebook } = useNotebooks();
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');

  const handleCreateNotebook = () => {
    if (!newNotebookTitle.trim()) {
      toast.error('Digite um título para o caderno');
      return;
    }

    createNotebook(newNotebookTitle);
    setNewNotebookTitle('');
    setIsCreateDialogOpen(false);
    toast.success('Caderno criado!');
  };

  const handleDeleteNotebook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotebook(id);
    if (selectedNotebook?.id === id) {
      setSelectedNotebook(null);
    }
    toast.success('Caderno excluído');
  };

  const handleStrokesChange = (strokes: any[]) => {
    if (!selectedNotebook) return;

    const updatedPages = [...selectedNotebook.pages];
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      strokes,
    };

    const updatedNotebook = {
      ...selectedNotebook,
      pages: updatedPages,
    };

    updateNotebook(selectedNotebook.id, { pages: updatedPages });
    setSelectedNotebook(updatedNotebook);
  };

  if (selectedNotebook) {
    const currentPage = selectedNotebook.pages[currentPageIndex];

    return (
      <div className="flex flex-col h-screen">
        <div className="flex items-center gap-4 p-4 bg-background border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedNotebook(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{selectedNotebook.title}</h1>
          <span className="text-sm text-muted-foreground ml-auto">
            Página {currentPageIndex + 1} de {selectedNotebook.pages.length}
          </span>
        </div>

        <NotebookCanvas
          strokes={currentPage.strokes}
          onStrokesChange={handleStrokesChange}
          template={currentPage.template}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen px-6 py-8">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-7 h-7 text-primary" />
            <h2 className="text-2xl font-semibold">Caderno Digital</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Crie cadernos organizados, escreva à mão e organize seu estudo
          </p>
        </div>

        {/* Create Button */}
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="mb-6 w-fit gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Caderno
        </Button>

        {/* Notebooks Grid */}
        {notebooks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum caderno ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro caderno para começar a anotar
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Caderno
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className="group relative p-6 bg-card border rounded-lg hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedNotebook(notebook)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: notebook.color + '20' }}
                  >
                    <Book className="w-6 h-6" style={{ color: notebook.color }} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <h3 className="font-medium mb-1 line-clamp-2">{notebook.title}</h3>
                {notebook.subject && (
                  <p className="text-sm text-muted-foreground mb-2">{notebook.subject}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {notebook.pages.length} {notebook.pages.length === 1 ? 'página' : 'páginas'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Caderno</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Nome do caderno"
                value={newNotebookTitle}
                onChange={(e) => setNewNotebookTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateNotebook}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Caderno;
