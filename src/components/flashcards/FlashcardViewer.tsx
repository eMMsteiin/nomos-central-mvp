import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageOcclusionData } from './ImageOcclusionEditor';

interface FlashcardViewerProps {
  front: string;
  back: string;
  color?: string;
  isFlipped?: boolean;
  onFlip?: () => void;
  className?: string;
}

// ── Content detection ──────────────────────────────────────────────────────

function tryParseImageOcclusion(text: string): ImageOcclusionData | null {
  if (!text || text[0] !== '{') return null;
  try {
    const data = JSON.parse(text);
    if (data.__nomos_type === 'image-occlusion') return data as ImageOcclusionData;
  } catch {}
  return null;
}

function hasClozeHtml(text: string): boolean {
  return text.includes('<span class="cloze');
}

// ── Renderers ─────────────────────────────────────────────────────────────

function ImageOcclusionCard({ data, textColor }: { data: ImageOcclusionData; textColor: string }) {
  return (
    <div className="relative w-full select-none">
      <img
        src={data.src}
        alt="Image occlusion"
        className="w-full rounded-lg pointer-events-none"
        draggable={false}
      />
      {data.allRects.map((rect, i) => {
        const isTarget = i === data.targetIndex;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
            }}
            className={cn(
              'rounded-sm',
              isTarget && data.occluded && 'bg-[#4a86e8]',
              isTarget && !data.occluded && 'bg-green-400/30 border-2 border-green-400',
              !isTarget && 'bg-[#4a86e8]/20 border border-[#4a86e8]/40',
            )}
          />
        );
      })}
    </div>
  );
}

function CardContent({ text, className }: { text: string; className: string }) {
  const occlusion = tryParseImageOcclusion(text);
  if (occlusion) {
    return <ImageOcclusionCard data={occlusion} textColor={className} />;
  }

  if (hasClozeHtml(text)) {
    return (
      <div
        className={cn(className, 'leading-relaxed')}
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

// ── Main component ─────────────────────────────────────────────────────────

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

  // Image occlusion cards use a neutral background instead of the deck color
  const isOcclusion = !!tryParseImageOcclusion(front);

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
            className={cn(
              'w-full rounded-2xl shadow-lg p-4 sm:p-6 flex flex-col items-center justify-center min-h-[200px]',
              isOcclusion && 'bg-card border-2',
            )}
            style={isOcclusion ? { borderColor: color } : { backgroundColor: color }}
          >
            <CardContent
              text={front}
              className={cn(
                'text-base sm:text-lg md:text-xl font-medium text-center w-full',
                isOcclusion ? 'text-foreground' : 'text-white',
              )}
            />
            <div
              className={cn(
                'mt-4 flex items-center gap-2 text-sm shrink-0',
                isOcclusion ? 'text-muted-foreground' : 'text-white/70',
              )}
            >
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
