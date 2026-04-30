import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashcardViewerProps {
  front: string;
  back: string;
  color?: string;
  isFlipped?: boolean;
  onFlip?: () => void;
  className?: string;
}

// Detect cloze HTML produced by renderClozeForCard — the only HTML we embed in cards.
// Any other card content is rendered as plain text.
function hasClozeHtml(text: string): boolean {
  return text.includes('<span class="cloze');
}

function CardContent({ text, className }: { text: string; className: string }) {
  if (hasClozeHtml(text)) {
    return (
      <div
        className={cn(className, 'leading-relaxed')}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }
  return (
    <p className={cn(className, 'break-words whitespace-pre-wrap overflow-hidden')}>
      {text}
    </p>
  );
}

export function FlashcardViewer({
  front,
  back,
  color = 'hsl(200, 70%, 50%)',
  isFlipped: controlledIsFlipped,
  onFlip,
  className,
}: FlashcardViewerProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false);

  const isFlipped = controlledIsFlipped ?? internalIsFlipped;

  const handleFlip = () => {
    if (onFlip) {
      onFlip();
    } else {
      setInternalIsFlipped(!internalIsFlipped);
    }
  };

  return (
    <div
      className={cn('relative w-full cursor-pointer perspective-1000', className)}
      onClick={handleFlip}
    >
      {!isFlipped && (
        <motion.div
          className="w-full"
          initial={{ rotateY: 0 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="w-full rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center justify-center min-h-[200px]"
            style={{ backgroundColor: color }}
          >
            <CardContent
              text={front}
              className="text-white text-base sm:text-lg md:text-xl font-medium text-center w-full"
            />
            <div className="mt-4 flex items-center gap-2 text-white/70 text-sm shrink-0">
              <RotateCcw className="w-4 h-4" />
              <span>Toque para ver resposta</span>
            </div>
          </div>
        </motion.div>
      )}

      {isFlipped && (
        <motion.div
          className="w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="w-full rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center justify-center min-h-[200px] bg-card border-2"
            style={{ borderColor: color }}
          >
            <CardContent
              text={back}
              className="text-foreground text-base sm:text-lg md:text-xl font-medium text-center w-full"
            />
            <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm shrink-0">
              <RotateCcw className="w-4 h-4" />
              <span>Toque para voltar</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
