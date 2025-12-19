import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FullscreenTimerProps {
  taskName: string;
  formattedTime: string;
  progress: number;
  isRunning: boolean;
  isFinished: boolean;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function FullscreenTimer({
  taskName,
  formattedTime,
  progress,
  isRunning,
  isFinished,
  onStart,
  onPause,
  onSkip,
  onClose
}: FullscreenTimerProps) {
  // Close on ESC key and block body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    // Block body scroll
    document.body.style.overflow = 'hidden';
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Color based on progress - matches the design system
  const getProgressColor = () => {
    if (progress < 50) return "hsl(var(--secondary))";  // Verde Oliveira
    if (progress < 75) return "hsl(var(--primary))";    // Azul Egeu
    return "hsl(var(--destructive))";                    // Vermelho
  };

  const radius = 140;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{ backgroundColor: "hsl(40, 25%, 97%)" }}
      >
        {/* Close button - subtle, top right */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 right-6 h-10 w-10 text-muted-foreground/60 hover:text-muted-foreground hover:bg-transparent"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Task name - subtle */}
        <motion.span 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground/70 text-sm tracking-wide mb-10 max-w-md text-center px-4"
        >
          {taskName}
        </motion.span>

        {/* Circular Timer - Apple style */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="relative"
          style={{ width: radius * 2, height: radius * 2 }}
        >
          <svg 
            className="transform -rotate-90"
            width={radius * 2} 
            height={radius * 2}
          >
            {/* Background circle */}
            <circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              stroke="hsl(var(--muted))"
              strokeWidth={strokeWidth}
              fill="none"
              opacity={0.5}
            />
            {/* Progress circle */}
            <motion.circle
              cx={radius}
              cy={radius}
              r={normalizedRadius}
              stroke={getProgressColor()}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              initial={false}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>

          {/* Time display - Apple style numbers */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span 
              key={formattedTime}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              className="tabular-nums tracking-tight"
              style={{
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
                fontWeight: 200,
                fontSize: "4.5rem",
                color: "hsl(var(--foreground))",
                letterSpacing: "-0.02em"
              }}
            >
              {formattedTime}
            </motion.span>
          </div>
        </motion.div>

        {/* Finished state */}
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-secondary font-medium"
          >
            Sessão concluída!
          </motion.div>
        )}

        {/* Controls - minimalist */}
        {!isFinished && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-6 mt-12"
          >
            {!isRunning ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 hover:text-secondary transition-all"
                onClick={onStart}
              >
                <Play className="h-7 w-7 ml-1" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all"
                onClick={onPause}
              >
                <Pause className="h-7 w-7" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-all"
              onClick={onSkip}
              title="Pular sessão"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* Hint - ESC to close */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 text-muted-foreground/40 text-xs"
        >
          ESC para sair
        </motion.span>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
