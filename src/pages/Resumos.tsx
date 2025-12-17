import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Sparkles, Search, BookOpen } from 'lucide-react';
import { useSummaries } from '@/hooks/useSummaries';
import { SummaryCard } from '@/components/summaries/SummaryCard';
import { GenerateSummaryDialog } from '@/components/summaries/GenerateSummaryDialog';
import { SummaryRenderer } from '@/components/summaries/SummaryRenderer';
import { DEFAULT_DISCIPLINES, Summary, SUMMARY_TEMPLATES } from '@/types/summary';
import { toast } from 'sonner';

const Resumos = () => {
  const { summaries, isLoading, createSummary, deleteSummary } = useSummaries();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  const filteredSummaries = summaries.filter(s => {
    const matchesSearch = !searchQuery || 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDiscipline = filterDiscipline === 'all' || s.disciplineId === filterDiscipline;
    return matchesSearch && matchesDiscipline;
  });

  const handleSaveSummary = (data: Parameters<typeof createSummary>[0]) => {
    createSummary(data);
    toast.success('Resumo salvo com sucesso!');
  };

  const handleDeleteSummary = (id: string) => {
    deleteSummary(id);
    toast.success('Resumo excluído');
  };

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 relative min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Resumos</h1>
              <p className="text-sm text-muted-foreground">
                {summaries.length} {summaries.length === 1 ? 'resumo' : 'resumos'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Novo Resumo
            </Button>
            <Button size="sm" onClick={() => setGenerateDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar com IA
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar resumos..."
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
              {DEFAULT_DISCIPLINES.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.emoji} {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredSummaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <BookOpen className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchQuery || filterDiscipline !== 'all' 
                ? 'Nenhum resumo encontrado' 
                : 'Nenhum resumo criado ainda'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              {searchQuery || filterDiscipline !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro resumo manualmente ou gere um com IA a partir de um tópico'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" disabled>
                <Plus className="h-4 w-4 mr-2" />
                Criar Resumo
              </Button>
              <Button onClick={() => setGenerateDialogOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar com IA
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSummaries.map((summary) => (
              <SummaryCard
                key={summary.id}
                summary={summary}
                onClick={() => setSelectedSummary(summary)}
                onDelete={() => handleDeleteSummary(summary.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Generate Dialog */}
      <GenerateSummaryDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSave={handleSaveSummary}
      />

      {/* View Summary Dialog */}
      {selectedSummary && (
        <Dialog open={!!selectedSummary} onOpenChange={() => setSelectedSummary(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {DEFAULT_DISCIPLINES.find(d => d.id === selectedSummary.disciplineId)?.emoji}
                {selectedSummary.title}
              </DialogTitle>
              <div className="flex gap-2 flex-wrap pt-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {SUMMARY_TEMPLATES[selectedSummary.template].emoji} {SUMMARY_TEMPLATES[selectedSummary.template].name}
                </span>
                {selectedSummary.tags.map(tag => (
                  <span key={tag} className="text-xs bg-muted px-2 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
              <SummaryRenderer 
                content={selectedSummary.content} 
                template={selectedSummary.template} 
              />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Resumos;
