import { useState, useMemo } from 'react';
import { useNotebooks } from '@/hooks/useNotebooks';
import { NotebookCanvas } from '@/components/NotebookCanvas';
import { ImportPdfDialog } from '@/components/ImportPdfDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Book, Plus, Trash2, ArrowLeft, Search, Upload, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Notebook } from '@/types/notebook';

const Caderno = () => {
  const { notebooks, createNotebook, deleteNotebook, updateNotebook } = useNotebooks();
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [newNotebookTitle, setNewNotebookTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'blank' | 'lined' | 'grid' | 'dotted'>('blank');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');

  // Get unique disciplines
  const disciplines = useMemo(() => {
    const disciplineSet = new Set<string>();
    notebooks.forEach(n => {
      if (n.discipline) disciplineSet.add(n.discipline);
    });
    return Array.from(disciplineSet).sort();
  }, [notebooks]);

  // Filter notebooks
  const filteredNotebooks = useMemo(() => {
    return notebooks.filter(notebook => {
      const matchesSearch = notebook.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiscipline = filterDiscipline === 'all' || notebook.discipline === filterDiscipline;
      return matchesSearch && matchesDiscipline;
    });
  }, [notebooks, searchQuery, filterDiscipline]);

  // Group by discipline
  const groupedNotebooks = useMemo(() => {
    const groups: Record<string, Notebook[]> = {};
    filteredNotebooks.forEach(notebook => {
      const key = notebook.discipline || 'Sem disciplina';
      if (!groups[key]) groups[key] = [];
      groups[key].push(notebook);
    });
    return groups;
  }, [filteredNotebooks]);

  const handleCreateNotebook = () => {
    if (!newNotebookTitle.trim()) {
      toast.error('Digite um título para o caderno');
      return;
    }

    createNotebook(newNotebookTitle, selectedTemplate, selectedDiscipline || undefined);
    setNewNotebookTitle('');
    setSelectedTemplate('blank');
    setSelectedDiscipline('');
    setIsCreateDialogOpen(false);
    toast.success('Caderno criado!');
  };

  const handleImportPdf = (notebookData: Partial<Notebook>) => {
    const newNotebook: Notebook = {
      id: crypto.randomUUID(),
      title: notebookData.title || 'PDF Importado',
      discipline: notebookData.discipline,
      color: notebookData.color || '#FF6B6B',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pages: notebookData.pages || [],
      isPdf: true,
    };

    const updated = [...notebooks, newNotebook];
    localStorage.setItem('nomos-notebooks', JSON.stringify(updated));
    window.dispatchEvent(new Event('notebooks-updated'));
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
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{selectedNotebook.title}</h1>
            {selectedNotebook.discipline && (
              <p className="text-sm text-muted-foreground">{selectedNotebook.discipline}</p>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Página {currentPageIndex + 1} de {selectedNotebook.pages.length}
          </span>
        </div>

        <NotebookCanvas
          strokes={currentPage.strokes}
          onStrokesChange={handleStrokesChange}
          template={currentPage.template}
          backgroundImage={currentPage.backgroundImage}
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

        {/* Actions Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Caderno
          </Button>
          <Button onClick={() => setIsPdfDialogOpen(true)} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar PDF
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cadernos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterDiscipline} onValueChange={setFilterDiscipline}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Todas as disciplinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {disciplines.map(disc => (
                <SelectItem key={disc} value={disc}>{disc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notebooks Grid */}
        {filteredNotebooks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || filterDiscipline !== 'all' 
                  ? 'Nenhum caderno encontrado' 
                  : 'Nenhum caderno ainda'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterDiscipline !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Crie seu primeiro caderno para começar a anotar'}
              </p>
              {!searchQuery && filterDiscipline === 'all' && (
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Caderno
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedNotebooks).map(([discipline, notebooksInGroup]) => (
              <div key={discipline}>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <span>{discipline}</span>
                  <span className="text-sm text-muted-foreground">({notebooksInGroup.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {notebooksInGroup.map((notebook) => (
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
                          {notebook.isPdf ? (
                            <FileText className="w-6 h-6" style={{ color: notebook.color }} />
                          ) : (
                            <Book className="w-6 h-6" style={{ color: notebook.color }} />
                          )}
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
                      <p className="text-xs text-muted-foreground">
                        {notebook.pages.length} {notebook.pages.length === 1 ? 'página' : 'páginas'}
                      </p>
                    </div>
                  ))}
                </div>
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
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Nome do caderno"
                  value={newNotebookTitle}
                  onChange={(e) => setNewNotebookTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discipline">Disciplina (opcional)</Label>
                <Input
                  id="discipline"
                  placeholder="Ex: Matemática, Física..."
                  value={selectedDiscipline}
                  onChange={(e) => setSelectedDiscipline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Template da página</Label>
                <Select value={selectedTemplate} onValueChange={(val: any) => setSelectedTemplate(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blank">Em branco</SelectItem>
                    <SelectItem value="lined">Pautado</SelectItem>
                    <SelectItem value="grid">Quadriculado</SelectItem>
                    <SelectItem value="dotted">Pontilhado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateNotebook}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import PDF Dialog */}
        <ImportPdfDialog
          open={isPdfDialogOpen}
          onOpenChange={setIsPdfDialogOpen}
          onImport={handleImportPdf}
          discipline={filterDiscipline !== 'all' ? filterDiscipline : undefined}
        />
      </div>
    </div>
  );
};

export default Caderno;
