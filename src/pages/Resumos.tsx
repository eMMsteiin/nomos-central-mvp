import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSummaries } from '@/hooks/useSummaries';
import { SummaryList } from '@/components/summaries/SummaryList';
import { SummaryViewer } from '@/components/summaries/SummaryViewer';
import { SummaryFilters } from '@/components/summaries/SummaryFilters';
import { CreateSummaryDialog } from '@/components/summaries/CreateSummaryDialog';
import { GenerateFlashcardsFromSummaryDialog } from '@/components/summaries/GenerateFlashcardsFromSummaryDialog';
import { Summary, SummaryType } from '@/types/summary';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'list' | 'detail';

const Resumos = () => {
  const navigate = useNavigate();
  const { summaries, isLoading, deleteSummary, createSummary } = useSummaries();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [activeFilter, setActiveFilter] = useState<SummaryType | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [flashcardDialogOpen, setFlashcardDialogOpen] = useState(false);
  const [summaryForFlashcards, setSummaryForFlashcards] = useState<Summary | null>(null);

  const counts = {
    all: summaries.length,
    essential: summaries.filter(s => s.type === 'essential').length,
    exam: summaries.filter(s => s.type === 'exam').length,
  };

  const handleViewSummary = (summary: Summary) => {
    setSelectedSummary(summary);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setSelectedSummary(null);
    setViewMode('list');
  };

  const handleDelete = (id: string) => {
    deleteSummary(id);
    toast.success('Resumo excluído');
    if (selectedSummary?.id === id) handleBackToList();
  };

  const handleConvertToFlashcards = (summary: Summary) => {
    setSummaryForFlashcards(summary);
    setFlashcardDialogOpen(true);
  };

  const handleFlashcardsGenerated = (_deckId: string, cardCount: number) => {
    setFlashcardDialogOpen(false);
    toast.success(`${cardCount} flashcards criados com sucesso!`);
    setTimeout(() => navigate('/flashcards'), 500);
  };

  const handleSummaryCreated = (data: { title: string; content: string; subject: string; type: SummaryType; sourceType: string }) => {
    const newSummary = createSummary({
      title: data.title,
      content: data.content,
      subject: data.subject,
      type: data.type,
      sourceType: data.sourceType as any,
    });
    toast.success('Resumo criado com sucesso!');
    setSelectedSummary(newSummary);
    setViewMode('detail');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (viewMode === 'detail' && selectedSummary) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <SummaryViewer
          summary={selectedSummary}
          onBack={handleBackToList}
          onConvertToFlashcards={handleConvertToFlashcards}
        />
        <GenerateFlashcardsFromSummaryDialog
          open={flashcardDialogOpen}
          onOpenChange={setFlashcardDialogOpen}
          summary={summaryForFlashcards}
          onSuccess={handleFlashcardsGenerated}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Resumos</h1>
              <p className="text-muted-foreground">
                {summaries.length} {summaries.length === 1 ? 'resumo' : 'resumos'} · Consolidação de aprendizado
              </p>
            </div>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo resumo
          </Button>
        </div>
      </motion.div>

      {summaries.length > 0 && (
        <div className="mb-6">
          <SummaryFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
        </div>
      )}

      <SummaryList
        summaries={summaries}
        filter={activeFilter}
        onView={handleViewSummary}
        onDelete={handleDelete}
        onConvertToFlashcards={handleConvertToFlashcards}
        onCreateNew={() => setCreateDialogOpen(true)}
      />

      <CreateSummaryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleSummaryCreated}
      />

      <GenerateFlashcardsFromSummaryDialog
        open={flashcardDialogOpen}
        onOpenChange={setFlashcardDialogOpen}
        summary={summaryForFlashcards}
        onSuccess={handleFlashcardsGenerated}
      />
    </div>
  );
};

export default Resumos;
