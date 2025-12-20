import { motion } from 'framer-motion';
import { ArrowLeft, FileText, GraduationCap, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Summary } from '@/types/summary';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface SummaryViewerProps {
  summary: Summary;
  onBack: () => void;
  onConvertToFlashcards?: (summary: Summary) => void;
}

export function SummaryViewer({ summary, onBack, onConvertToFlashcards }: SummaryViewerProps) {
  const isExam = summary.type === 'exam';

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{summary.emoji || '📄'}</span>
            <Badge 
              variant={isExam ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {isExam ? (
                <>
                  <GraduationCap className="w-3 h-3 mr-1" />
                  Resumo para Prova
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3 mr-1" />
                  Resumo Essencial
                </>
              )}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{summary.title}</h1>
          <p className="text-muted-foreground">{summary.subject}</p>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3"
      >
        {onConvertToFlashcards && (
          <Button 
            onClick={() => onConvertToFlashcards(summary)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Transformar em Flashcards
          </Button>
        )}
      </motion.div>

      {/* Content card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{summary.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metadata */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-4 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>
            Criado em {format(new Date(summary.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
