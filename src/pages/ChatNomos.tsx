import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { useChatConversations } from '@/hooks/useChatConversations';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ProposalCard } from '@/components/chat/ProposalCard';
import { QuickActionChips } from '@/components/chat/QuickActionChips';
import { ChatInput } from '@/components/chat/ChatInput';
import { RecentChangesSheet } from '@/components/chat/RecentChangesSheet';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ChatNomos() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const {
    conversations,
    activeConversationId,
    createConversation,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    refresh: refreshConversations
  } = useChatConversations();

  const {
    messages,
    isLoading,
    sendMessage,
    applyProposal,
    cancelProposal,
    clearConversation,
    recentActions
  } = useChat({
    externalConversationId: activeConversationId,
    onConversationCreated: (id, title) => {
      refreshConversations();
      if (title) {
        updateConversationTitle(id, title);
      }
    }
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const findActionForProposal = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.proposal) return undefined;
    
    return recentActions.find(
      a => a.action_type === message.proposal?.action_type && a.status === 'proposed'
    );
  };

  const handleNewConversation = async () => {
    await createConversation();
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string | null) => {
    selectConversation(id);
    setSidebarOpen(false);
  };

  const SidebarContent = (
    <ChatSidebar
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={deleteConversation}
      className="h-full"
    />
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-56 flex-shrink-0 border-r">
          {SidebarContent}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - Minimal */}
        <div className="flex-shrink-0 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="w-4 h-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64">
                    {SidebarContent}
                  </SheetContent>
                </Sheet>
              )}
              <div>
                <h1 className="font-medium text-sm">Chat</h1>
                <p className="text-xs text-muted-foreground">
                  Rotina realista. Sem culpa.
                </p>
              </div>
            </div>
            <RecentChangesSheet actions={recentActions} />
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-4 max-w-2xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <h2 className="text-sm font-medium mb-2">Olá</h2>
                <p className="text-muted-foreground text-xs max-w-sm mb-6">
                  Estou aqui para ajudar a organizar sua rotina.
                </p>
                <QuickActionChips onSelect={sendMessage} disabled={isLoading} />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <ChatMessage message={message} />
                    
                    {message.proposal && message.role === 'assistant' && (
                      <div className="ml-8">
                        <ProposalCard
                          proposal={message.proposal}
                          action={findActionForProposal(message.id)}
                          onApply={() => {
                            const action = findActionForProposal(message.id);
                            if (action) applyProposal(action.id);
                          }}
                          onCancel={() => {
                            const action = findActionForProposal(message.id);
                            if (action) cancelProposal(action.id);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center text-background text-xs">
                      N
                    </div>
                    <div className="bg-muted rounded px-3 py-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={scrollRef} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex-shrink-0 border-t bg-background">
          {messages.length > 0 && (
            <div className="px-4 pt-3 max-w-2xl mx-auto">
              <QuickActionChips onSelect={sendMessage} disabled={isLoading} />
            </div>
          )}
          <div className="max-w-2xl mx-auto">
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
