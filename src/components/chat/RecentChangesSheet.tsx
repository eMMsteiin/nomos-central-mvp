import { ChatAction } from '@/types/chat';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Check, X, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecentChangesSheetProps {
  actions: ChatAction[];
}

const STATUS_CONFIG = {
  proposed: { label: 'Proposta', icon: Clock, color: 'bg-yellow-500' },
  applied: { label: 'Aplicada', icon: Check, color: 'bg-green-500' },
  cancelled: { label: 'Cancelada', icon: X, color: 'bg-gray-500' },
  failed: { label: 'Falhou', icon: AlertCircle, color: 'bg-red-500' },
};

const ACTION_LABELS: Record<string, string> = {
  create_routine_block: 'Criar bloco de rotina',
  redistribute_tasks: 'Redistribuir tarefas',
  reschedule_day: 'Reprogramar dia',
  activate_exam_mode: 'Ativar modo provas',
  start_study_session: 'Iniciar sessão de estudo',
};

export function RecentChangesSheet({ actions }: RecentChangesSheetProps) {
  const appliedCount = actions.filter(a => a.status === 'applied').length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">Mudanças recentes</span>
          {appliedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {appliedCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Mudanças Recentes
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] mt-4 pr-4">
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma ação registrada ainda.</p>
              <p className="text-sm mt-1">As propostas do chat aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => {
                const config = STATUS_CONFIG[action.status];
                const StatusIcon = config.icon;
                
                return (
                  <div
                    key={action.id}
                    className={cn(
                      'p-3 rounded-lg border bg-card transition-all',
                      action.status === 'applied' && 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {ACTION_LABELS[action.action_type] || action.action_type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(action.created_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          'text-white text-xs',
                          config.color
                        )}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
