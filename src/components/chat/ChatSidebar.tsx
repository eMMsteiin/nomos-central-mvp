import { Plus, MessageSquare, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Conversation } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  className?: string;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  className
}: ChatSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

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

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      onDeleteConversation(conversationToDelete);
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
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
          {/* All Conversations */}
          {conversations.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                Conversas
              </p>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "group relative w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer",
                    "hover:bg-muted/50 flex items-start gap-2",
                    activeConversationId === conv.id && "bg-primary/10 text-primary"
                  )}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-sm font-medium truncate">
                      {truncateTitle(conv.title)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(conv.created_at)}
                    </p>
                  </div>
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => handleDeleteClick(e, conv.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {conversations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa ainda</p>
              <p className="text-xs mt-1">Clique em "Nova conversa" para começar</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conversa e todas as mensagens serão permanentemente apagadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
