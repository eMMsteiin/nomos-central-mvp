import { useState } from 'react';
import { Proposal, ChatAction } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, Sparkles, Calendar, Zap, BookOpen, Play, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProposalCardProps {
  proposal: Proposal;
  action?: ChatAction;
  onApply: () => void;
  onCancel: () => void;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create_routine_block: <Calendar className="w-5 h-5" />,
  redistribute_tasks: <RefreshCw className="w-5 h-5" />,
  reschedule_day: <Calendar className="w-5 h-5" />,
  activate_exam_mode: <BookOpen className="w-5 h-5" />,
  start_study_session: <Play className="w-5 h-5" />,
};

const ACTION_COLORS: Record<string, string> = {
  create_routine_block: 'from-blue-500 to-indigo-600',
  redistribute_tasks: 'from-orange-500 to-amber-600',
  reschedule_day: 'from-rose-500 to-pink-600',
  activate_exam_mode: 'from-purple-500 to-violet-600',
  start_study_session: 'from-green-500 to-emerald-600',
};

export function ProposalCard({ proposal, action, onApply, onCancel }: ProposalCardProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const status = action?.status || 'proposed';
  const isResolved = status === 'applied' || status === 'cancelled';

  const handleApply = async () => {
    setIsApplying(true);
    await onApply();
    setIsApplying(false);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    await onCancel();
    setIsCancelling(false);
  };

  const icon = ACTION_ICONS[proposal.action_type] || <Sparkles className="w-5 h-5" />;
  const gradientColor = ACTION_COLORS[proposal.action_type] || 'from-violet-500 to-purple-600';

  return (
    <Card className={cn(
      'w-full max-w-md border-2 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4',
      isResolved ? 'opacity-60' : 'shadow-lg',
      status === 'applied' && 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20',
      status === 'cancelled' && 'border-muted'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-2 rounded-lg bg-gradient-to-br text-white',
            gradientColor
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              Proposta de Ação
              {status === 'applied' && (
                <Badge variant="default" className="bg-green-500 text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Aplicada
                </Badge>
              )}
              {status === 'cancelled' && (
                <Badge variant="secondary" className="text-xs">
                  Cancelada
                </Badge>
              )}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">{proposal.description}</p>
        
        {proposal.impact && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span><strong>Impacto:</strong> {proposal.impact}</span>
          </div>
        )}
      </CardContent>

      {!isResolved && (
        <CardFooter className="gap-2 pt-0">
          <Button
            onClick={handleApply}
            disabled={isApplying || isCancelling}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {isApplying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Aplicar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isApplying || isCancelling}
            className="flex-1"
          >
            {isCancelling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
