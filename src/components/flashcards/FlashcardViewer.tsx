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
      className={cn(
        'relative w-full cursor-pointer perspective-1000',
        className
      )}
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front side */}
        <div
          className={cn(
            'w-full rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center min-h-[200px]',
            isFlipped && 'invisible'
          )}
          style={{
            backgroundColor: color,
            backfaceVisibility: 'hidden',
          }}
        >
          <p className="text-white text-lg md:text-xl font-medium text-center leading-relaxed break-words whitespace-pre-wrap w-full">
            {front}
          </p>
          <div className="mt-4 flex items-center gap-2 text-white/70 text-sm shrink-0">
            <RotateCcw className="w-4 h-4" />
            <span>Toque para ver resposta</span>
          </div>
        </div>

        {/* Back side */}
        <div
          className="absolute inset-0 w-full rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center min-h-[200px] bg-card border-2"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: color,
          }}
        >
          <p className="text-foreground text-lg md:text-xl font-medium text-center leading-relaxed break-words whitespace-pre-wrap w-full">
            {back}
          </p>
          <div className="mt-4 flex items-center gap-2 text-muted-foreground text-sm shrink-0">
            <RotateCcw className="w-4 h-4" />
            <span>Toque para voltar</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
