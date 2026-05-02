import { useState, useRef, useCallback } from 'react';
import { Trash2, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface OcclusionRect {
  id: string;
  x: number; // 0–1 relative to image
  y: number;
  w: number;
  h: number;
}

interface DrawState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ImageOcclusionEditorProps {
  onComplete: (cards: Array<{ front: string; back: string }>) => void;
}

// ── Data format stored in card front/back ──────────────────────────────────
export interface ImageOcclusionData {
  __nomos_type: 'image-occlusion';
  src: string;
  allRects: Array<{ x: number; y: number; w: number; h: number }>;
  targetIndex: number;
  occluded: boolean; // true = front (hide), false = back (reveal)
}

function buildCards(
  src: string,
  rects: OcclusionRect[],
): Array<{ front: string; back: string }> {
  const allRects = rects.map(({ x, y, w, h }) => ({ x, y, w, h }));
  return rects.map((_, targetIndex) => ({
    front: JSON.stringify({
      __nomos_type: 'image-occlusion',
      src,
      allRects,
      targetIndex,
      occluded: true,
    } satisfies ImageOcclusionData),
    back: JSON.stringify({
      __nomos_type: 'image-occlusion',
      src,
      allRects,
      targetIndex,
      occluded: false,
    } satisfies ImageOcclusionData),
  }));
}

// Compress uploaded image to ≤1200px wide, JPEG 0.78 quality
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.naturalWidth);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImageOcclusionEditor({ onComplete }: ImageOcclusionEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rects, setRects] = useState<OcclusionRect[]>([]);
  const [drawing, setDrawing] = useState<DrawState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image upload ───────────────────────────────────────────────────────────

  const loadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const src = await compressImage(file);
      setImageSrc(src);
      setRects([]);
    } catch (e) {
      console.error('Image compression failed', e);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  // ── Rectangle drawing (pointer events) ────────────────────────────────────

  const getPos = (e: React.PointerEvent): { x: number; y: number } => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const b = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getPos(e);
    setDrawing({ startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const pos = getPos(e);
    setDrawing(prev => prev ? { ...prev, currentX: pos.x, currentY: pos.y } : null);
  };

  const handlePointerUp = () => {
    if (!drawing) return;
    const x = Math.min(drawing.startX, drawing.currentX);
    const y = Math.min(drawing.startY, drawing.currentY);
    const w = Math.abs(drawing.currentX - drawing.startX);
    const h = Math.abs(drawing.currentY - drawing.startY);
    if (w > 0.02 && h > 0.01) {
      setRects(prev => [...prev, { id: crypto.randomUUID(), x, y, w, h }]);
    }
    setDrawing(null);
  };

  const removeRect = (id: string) => setRects(prev => prev.filter(r => r.id !== id));

  // ── Preview rectangle for the in-progress drag ────────────────────────────

  const previewRect = drawing
    ? {
        x: Math.min(drawing.startX, drawing.currentX),
        y: Math.min(drawing.startY, drawing.currentY),
        w: Math.abs(drawing.currentX - drawing.startX),
        h: Math.abs(drawing.currentY - drawing.startY),
      }
    : null;

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!imageSrc || rects.length === 0) return;
    onComplete(buildCards(imageSrc, rects));
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!imageSrc) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <ImageIcon className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Arraste uma imagem aqui ou clique para selecionar
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Selecionar imagem
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Canvas editor */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Clique e arraste para criar lacunas
          </p>
          <button
            type="button"
            onClick={() => { setImageSrc(null); setRects([]); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Trocar imagem
          </button>
        </div>

        <div
          ref={containerRef}
          className="relative w-full rounded-lg overflow-hidden border border-border cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setDrawing(null)}
        >
          <img
            src={imageSrc}
            alt="Image for occlusion"
            className="w-full block pointer-events-none"
            draggable={false}
          />

          {/* Existing rects */}
          {rects.map((r, i) => (
            <div
              key={r.id}
              style={{
                position: 'absolute',
                left: `${r.x * 100}%`,
                top: `${r.y * 100}%`,
                width: `${r.w * 100}%`,
                height: `${r.h * 100}%`,
              }}
              className="bg-[#4a86e8] rounded-sm flex items-center justify-center"
            >
              <span className="text-white text-xs font-bold select-none pointer-events-none">
                {i + 1}
              </span>
            </div>
          ))}

          {/* Preview rect while drawing */}
          {previewRect && (
            <div
              style={{
                position: 'absolute',
                left: `${previewRect.x * 100}%`,
                top: `${previewRect.y * 100}%`,
                width: `${previewRect.w * 100}%`,
                height: `${previewRect.h * 100}%`,
                pointerEvents: 'none',
              }}
              className="bg-[#4a86e8]/60 border-2 border-[#4a86e8] rounded-sm"
            />
          )}
        </div>
      </div>

      {/* Rect list */}
      {rects.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {rects.length} {rects.length === 1 ? 'lacuna' : 'lacunas'} → {rects.length} {rects.length === 1 ? 'card' : 'cards'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rects.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 text-xs"
              >
                <span className="w-4 h-4 rounded-sm bg-[#4a86e8] flex items-center justify-center text-white font-bold text-[10px]">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRect(r.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rects.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma lacuna desenhada ainda.
        </p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={rects.length === 0}
        onClick={handleSubmit}
      >
        Gerar {rects.length > 0 ? `${rects.length} ` : ''}card{rects.length !== 1 ? 's' : ''}
      </Button>
    </div>
  );
}
