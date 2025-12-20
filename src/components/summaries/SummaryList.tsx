import { motion } from 'framer-motion';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Summary, SummaryType } from '@/types/summary';
import { SummaryCard } from './SummaryCard';

interface SummaryListProps {
  summaries: Summary[];
  filter: SummaryType | 'all';
  onView: (summary: Summary) => void;
  onDelete: (id: string) => void;
  onConvertToFlashcards?: (summary: Summary) => void;
  onCreateNew: () => void;
}

export function SummaryList({ 
  summaries, 
  filter,
  onView, 
  onDelete,
  onConvertToFlashcards,
  onCreateNew
}: SummaryListProps) {
  const filteredSummaries = filter === 'all' 
    ? summaries 
    : summaries.filter(s => s.type === filter);

  if (filteredSummaries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {filter === 'all' 
            ? 'Nenhum resumo ainda' 
            : filter === 'essential' 
              ? 'Nenhum resumo essencial'
              : 'Nenhum resumo para prova'}
        </h3>
        <p className="text-muted-foreground text-center mb-6 max-w-sm">
          {filter === 'all' 
            ? 'Use o Chat NOMOS para criar resumos automaticamente após suas sessões de estudo.'
            : `Ainda não há resumos do tipo "${filter === 'essential' ? 'essencial' : 'prova'}".`}
        </p>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Criar resumo
        </Button>
      </motion.div>
    );
  }

  // Group summaries by subject
  const groupedBySubject: Record<string, Summary[]> = {};
  filteredSummaries.forEach(summary => {
    if (!groupedBySubject[summary.subject]) {
      groupedBySubject[summary.subject] = [];
    }
    groupedBySubject[summary.subject].push(summary);
  });

  return (
    <div className="space-y-8">
      {Object.entries(groupedBySubject).map(([subject, subjectSummaries]) => (
        <motion.div
          key={subject}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Subject header */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{subjectSummaries[0]?.emoji || '📚'}</span>
            <h2 className="text-lg font-semibold text-foreground">{subject}</h2>
            <span className="text-sm text-muted-foreground">
              ({subjectSummaries.length} {subjectSummaries.length === 1 ? 'resumo' : 'resumos'})
            </span>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectSummaries.map((summary, index) => (
              <SummaryCard
                key={summary.id}
                summary={summary}
                index={index}
                onView={onView}
                onDelete={onDelete}
                onConvertToFlashcards={onConvertToFlashcards}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
