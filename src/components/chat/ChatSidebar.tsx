import { Plus, MessageSquare, Archive, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSidebarProps {
  activeConversations: Conversation[];
  archivedConversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewConversation: () => void;
  className?: string;
}

export function ChatSidebar({
  activeConversations,
  archivedConversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  className
}: ChatSidebarProps) {
  const [showArchived, setShowArchived] = useState(false);

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
      return '';
    }
  };

  const truncateTitle = (title?: string) => {
    if (!title) return 'Nova conversa';
    return title.length > 30 ? title.substring(0, 30) + '...' : title;
  };

  return (
    <div className={cn("flex flex-col h-full bg-muted/30 border-r", className)}>
      {/* New Conversation Button */}
      <div className="p-3 border-b">
        <Button 
          onClick={onNewConversation}
          className="w-full justify-start gap-2"
          variant="outline"
        >
          <Plus className="w-4 h-4" />
          Nova conversa
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Recent Conversations */}
          {activeConversations.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Recentes
              </p>
              {activeConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors",
                    "hover:bg-muted/50 flex items-start gap-2",
                    activeConversationId === conv.id && "bg-primary/10 text-primary"
                  )}
                >
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {truncateTitle(conv.title)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Archived Conversations */}
          {archivedConversations.length > 0 && (
            <Collapsible open={showArchived} onOpenChange={setShowArchived}>
              <CollapsibleTrigger className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
                {showArchived ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <Archive className="w-3 h-3" />
                Arquivadas ({archivedConversations.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {archivedConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg transition-colors",
                      "hover:bg-muted/50 flex items-start gap-2 opacity-70",
                      activeConversationId === conv.id && "bg-primary/10 text-primary opacity-100"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {truncateTitle(conv.title)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conv.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Empty State */}
          {activeConversations.length === 0 && archivedConversations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa ainda</p>
              <p className="text-xs mt-1">Clique em "Nova conversa" para começar</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
