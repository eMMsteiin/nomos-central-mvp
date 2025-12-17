import { Summary, SUMMARY_TEMPLATES, DEFAULT_DISCIPLINES } from '@/types/summary';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SummaryCardProps {
  summary: Summary;
  onClick: () => void;
  onDelete: () => void;
  onGenerateFlashcards?: () => void;
}

export const SummaryCard = ({ summary, onClick, onDelete, onGenerateFlashcards }: SummaryCardProps) => {
  const discipline = DEFAULT_DISCIPLINES.find(d => d.id === summary.disciplineId);
  const template = SUMMARY_TEMPLATES[summary.template];

  const getPreviewText = () => {
    const lines = summary.content.split('\n').filter(l => l.trim());
    const textLines = lines.filter(l => !l.startsWith('#')).slice(0, 2);
    return textLines.join(' ').slice(0, 100) + '...';
  };

  return (
    <Card 
      className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {discipline && (
              <span className="text-lg flex-shrink-0">{discipline.emoji}</span>
            )}
            <h3 className="font-semibold text-sm truncate">{summary.title}</h3>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onGenerateFlashcards && !summary.linkedFlashcardDeckId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateFlashcards();
                }}
              >
                <Layers className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {discipline && (
          <span className="text-xs text-muted-foreground">{discipline.name}</span>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">
          {getPreviewText()}
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {template.emoji} {template.name}
          </Badge>
          {summary.sourceType === 'ai' && (
            <Badge variant="outline" className="text-xs">
              ✨ IA
            </Badge>
          )}
          {summary.linkedFlashcardDeckId && (
            <Badge variant="outline" className="text-xs text-primary">
              🃏 Flashcards
            </Badge>
          )}
        </div>

        {summary.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {summary.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          📅 {formatDistanceToNow(new Date(summary.createdAt), { addSuffix: true, locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
};
