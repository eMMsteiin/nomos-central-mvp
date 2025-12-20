import { motion } from 'framer-motion';
import { FileText, GraduationCap, MoreVertical, Trash2, Eye, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Summary } from '@/types/summary';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SummaryCardProps {
  summary: Summary;
  index: number;
  onView: (summary: Summary) => void;
  onDelete: (id: string) => void;
  onConvertToFlashcards?: (summary: Summary) => void;
}

export function SummaryCard({ 
  summary, 
  index, 
  onView, 
  onDelete,
  onConvertToFlashcards 
}: SummaryCardProps) {
  const isExam = summary.type === 'exam';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="group cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden"
        onClick={() => onView(summary)}
      >
        {/* Color bar */}
        <div 
          className="h-2" 
          style={{ backgroundColor: summary.color || 'hsl(210, 28%, 50%)' }} 
        />
        
        <CardContent className="p-4">
          {/* Header with emoji and menu */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{summary.emoji || '📄'}</span>
              <Badge 
                variant={isExam ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {isExam ? (
                  <>
                    <GraduationCap className="w-3 h-3 mr-1" />
                    Prova
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3 mr-1" />
                    Essencial
                  </>
                )}
              </Badge>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onView(summary);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </DropdownMenuItem>
                {onConvertToFlashcards && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onConvertToFlashcards(summary);
                  }}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Criar Flashcards
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(summary.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
            {summary.title}
          </h3>

          {/* Subject */}
          <p className="text-sm text-muted-foreground mb-3">
            {summary.subject}
          </p>

          {/* Preview of content */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {summary.content.replace(/[*#•]/g, '').slice(0, 100)}...
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(summary.updatedAt), { 
                addSuffix: true,
                locale: ptBR 
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
