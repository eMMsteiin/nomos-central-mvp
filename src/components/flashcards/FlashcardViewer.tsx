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
        'relative w-full aspect-[3/2] cursor-pointer perspective-1000',
        className
      )}
      onClick={handleFlip}
    >
      <motion.div
        className="absolute inset-0 w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front side */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center backface-hidden"
          style={{
            backgroundColor: color,
            backfaceVisibility: 'hidden',
          }}
        >
          <p className="text-white text-xl md:text-2xl font-medium text-center leading-relaxed">
            {front}
          </p>
          <div className="absolute bottom-4 flex items-center gap-2 text-white/70 text-sm">
            <RotateCcw className="w-4 h-4" />
            <span>Toque para ver resposta</span>
          </div>
        </div>

        {/* Back side */}
        <div
          className="absolute inset-0 w-full h-full rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center bg-card border-2"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderColor: color,
          }}
        >
          <p className="text-foreground text-xl md:text-2xl font-medium text-center leading-relaxed">
            {back}
          </p>
          <div className="absolute bottom-4 flex items-center gap-2 text-muted-foreground text-sm">
            <RotateCcw className="w-4 h-4" />
            <span>Toque para voltar</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
