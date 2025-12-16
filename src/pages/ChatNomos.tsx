import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ProposalCard } from '@/components/chat/ProposalCard';
import { QuickActionChips } from '@/components/chat/QuickActionChips';
import { ChatInput } from '@/components/chat/ChatInput';
import { RecentChangesSheet } from '@/components/chat/RecentChangesSheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, Archive } from 'lucide-react';

export default function ChatNomos() {
  const {
    messages,
    isLoading,
    sendMessage,
    applyProposal,
    cancelProposal,
    clearConversation,
    recentActions
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Find the latest proposed action for a message's proposal
  const findActionForProposal = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.proposal) return undefined;
    
    return recentActions.find(
      a => a.action_type === message.proposal?.action_type && a.status === 'proposed'
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-gradient-to-r from-violet-500/10 to-purple-500/10 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Chat NOMOS</h1>
              <p className="text-xs text-muted-foreground">
                Rotina realista. Sem culpa. Vamos ajustar a dose.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RecentChangesSheet actions={recentActions} />
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearConversation}
                className="text-muted-foreground hover:text-foreground"
                title="Arquivar conversa"
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 mb-4">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Olá! Eu sou a Nomos</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Estou aqui pra te ajudar a organizar sua rotina de forma sustentável. 
                O que você precisa hoje?
              </p>
              <div className="mt-6">
                <QuickActionChips onSelect={sendMessage} disabled={isLoading} />
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div key={message.id} className="space-y-3">
                  <ChatMessage message={message} />
                  
                  {/* Show proposal card if message has one */}
                  {message.proposal && message.role === 'assistant' && (
                    <div className="ml-11">
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
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={scrollRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer with quick actions and input */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {messages.length > 0 && (
          <div className="px-4 pt-3">
            <QuickActionChips onSelect={sendMessage} disabled={isLoading} />
          </div>
        )}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
