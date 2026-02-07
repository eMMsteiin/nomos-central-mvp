import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScrollTrailIndicatorProps {
  targetRef: React.RefObject<HTMLElement>;
  width?: number;
  dotSize?: number;
  trailLength?: number;
  className?: string;
}

interface DotPosition {
  id: number;
  y: number;
  opacity: number;
}

export function ScrollTrailIndicator({
  targetRef,
  width = 6,
  dotSize = 3,
  trailLength = 8,
  className,
}: ScrollTrailIndicatorProps) {
  const [thumbTop, setThumbTop] = React.useState(0);
  const [thumbHeight, setThumbHeight] = React.useState(0);
  const [isInteracting, setIsInteracting] = React.useState(false);
  const [trail, setTrail] = React.useState<DotPosition[]>([]);
  const [showIndicator, setShowIndicator] = React.useState(false);
  
  const interactionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const trailIdRef = React.useRef(0);

  const updateScrollPosition = React.useCallback(() => {
    const el = targetRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    
    // Don't show if content doesn't overflow
    if (scrollHeight <= clientHeight) {
      setShowIndicator(false);
      return;
    }
    
    setShowIndicator(true);

    // Calculate thumb dimensions
    const trackHeight = clientHeight;
    const ratio = clientHeight / scrollHeight;
    const newThumbHeight = Math.max(ratio * trackHeight, 20);
    const maxTop = trackHeight - newThumbHeight;
    const scrollRatio = scrollTop / (scrollHeight - clientHeight);
    const newThumbTop = scrollRatio * maxTop;

    setThumbHeight(newThumbHeight);
    setThumbTop(newThumbTop);

    // Add new dot to trail when interacting
    if (isInteracting) {
      const centerY = newThumbTop + newThumbHeight / 2;
      setTrail((prev) => {
        const newDot: DotPosition = {
          id: trailIdRef.current++,
          y: centerY,
          opacity: 1,
        };
        // Keep only the last N dots
        const updated = [...prev, newDot].slice(-trailLength);
        // Apply fading opacity
        return updated.map((dot, index) => ({
          ...dot,
          opacity: (index + 1) / updated.length,
        }));
      });
    }
  }, [targetRef, isInteracting, trailLength]);

  const handleInteractionStart = React.useCallback(() => {
    setIsInteracting(true);
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
  }, []);

  const handleInteractionEnd = React.useCallback(() => {
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setIsInteracting(false);
      setTrail([]);
    }, 400);
  }, []);

  React.useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    // Initial calculation
    updateScrollPosition();

    // Scroll event
    const handleScroll = () => {
      handleInteractionStart();
      updateScrollPosition();
      handleInteractionEnd();
    };

    // Pointer events for drag detection
    const handlePointerDown = () => handleInteractionStart();
    const handlePointerUp = () => handleInteractionEnd();

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointerleave", handlePointerUp);

    // ResizeObserver for dynamic content
    const resizeObserver = new ResizeObserver(() => {
      updateScrollPosition();
    });
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointerleave", handlePointerUp);
      resizeObserver.disconnect();
      if (interactionTimeoutRef.current) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, [targetRef, updateScrollPosition, handleInteractionStart, handleInteractionEnd]);

  if (!showIndicator) return null;

  return (
    <div
      className={cn(
        "absolute right-1 top-0 bottom-0 pointer-events-none z-10",
        className
      )}
      style={{ width }}
    >
      <AnimatePresence mode="wait">
        {isInteracting ? (
          // Trail of dots during interaction
          <motion.div
            key="trail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0"
          >
            {trail.map((dot) => (
              <motion.div
                key={dot.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: dot.opacity, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="absolute rounded-full bg-muted-foreground/60"
                style={{
                  width: dotSize,
                  height: dotSize,
                  left: (width - dotSize) / 2,
                  top: dot.y - dotSize / 2,
                }}
              />
            ))}
          </motion.div>
        ) : (
          // Minimalist thumb bar
          <motion.div
            key="thumb"
            initial={{ opacity: 0, scaleX: 0.5 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.5 }}
            transition={{ duration: 0.2 }}
            className="absolute rounded-full bg-muted-foreground/30"
            style={{
              width: width - 2,
              height: thumbHeight,
              top: thumbTop,
              left: 1,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

