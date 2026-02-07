import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium',
          isUser 
            ? 'bg-foreground text-background' 
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? 'E' : 'N'}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'max-w-[80%] rounded-sm px-3 py-2',
          isUser
            ? 'bg-foreground text-background'
            : 'bg-muted text-foreground'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="text-[10px] opacity-50 mt-1 block">
          {new Date(message.created_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
}
