import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer = ({ content, className }: MarkdownRendererProps) => {
  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none",
      "prose-h1:text-xl prose-h1:font-bold prose-h1:mb-4 prose-h1:mt-0",
      "prose-h2:text-lg prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-6 prose-h2:border-b prose-h2:pb-2",
      "prose-h3:text-base prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-4",
      "prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-3",
      "prose-strong:text-foreground prose-strong:font-semibold",
      "prose-ul:my-2 prose-ul:ml-4",
      "prose-ol:my-2 prose-ol:ml-4",
      "prose-li:text-muted-foreground prose-li:mb-1",
      "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs",
      "prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-4",
      className
    )}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mb-3 mt-6 border-b pb-2 text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-medium mb-2 mt-4 text-foreground">
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul className="my-2 ml-4 space-y-1 list-disc">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-4 space-y-1 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-muted-foreground">
              {children}
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary bg-muted/30 py-2 px-4 rounded-r my-3 italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className={className}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
