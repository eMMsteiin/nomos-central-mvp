import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSummaries } from '@/hooks/useSummaries';
import { SummaryList } from '@/components/summaries/SummaryList';
import { SummaryViewer } from '@/components/summaries/SummaryViewer';
import { SummaryFilters } from '@/components/summaries/SummaryFilters';
import { Summary, SummaryType } from '@/types/summary';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'list' | 'detail';

const Resumos = () => {
  const navigate = useNavigate();
  const { summaries, isLoading, deleteSummary } = useSummaries();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [activeFilter, setActiveFilter] = useState<SummaryType | 'all'>('all');

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
    if (selectedSummary?.id === id) {
      handleBackToList();
    }
  };

  const handleConvertToFlashcards = (summary: Summary) => {
    // Store summary for flashcard generation
    localStorage.setItem('nomos-summary-to-flashcards', JSON.stringify(summary));
    toast.success('Redirecionando para Flashcards...', {
      description: 'Use a IA para gerar flashcards a partir deste resumo.',
    });
    navigate('/flashcards');
  };

  const handleCreateNew = () => {
    toast.info('Use o Chat NOMOS para criar resumos', {
      description: 'O Chat NOMOS cria resumos automaticamente após suas sessões de estudo.',
      action: {
        label: 'Ir para Chat',
        onClick: () => navigate('/chat'),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Detail view
  if (viewMode === 'detail' && selectedSummary) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <SummaryViewer
          summary={selectedSummary}
          onBack={handleBackToList}
          onConvertToFlashcards={handleConvertToFlashcards}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
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
                {summaries.length} {summaries.length === 1 ? 'resumo' : 'resumos'} • Consolidação de aprendizado
              </p>
            </div>
          </div>

          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo resumo
          </Button>
        </div>
      </motion.div>

      {/* Info banner about Chat NOMOS */}
      {summaries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <p className="font-medium">
                O Chat NOMOS cria resumos para você automaticamente!
              </p>
              <p className="text-sm text-muted-foreground">
                Após sessões de estudo, ele sugere consolidar seu aprendizado com resumos personalizados.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      {summaries.length > 0 && (
        <div className="mb-6">
          <SummaryFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
          />
        </div>
      )}

      {/* Summary list */}
      <SummaryList
        summaries={summaries}
        filter={activeFilter}
        onView={handleViewSummary}
        onDelete={handleDelete}
        onConvertToFlashcards={handleConvertToFlashcards}
        onCreateNew={handleCreateNew}
      />
    </div>
  );
};

export default Resumos;
