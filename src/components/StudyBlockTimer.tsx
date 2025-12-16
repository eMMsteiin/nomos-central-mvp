import { motion } from "framer-motion";
import { Play, Pause, SkipForward, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudyBlockTimerProps {
  formattedTime: string;
  progress: number;
  isRunning: boolean;
  isFinished: boolean;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
}

export function StudyBlockTimer({
  formattedTime,
  progress,
  isRunning,
  isFinished,
  onStart,
  onPause,
  onSkip
}: StudyBlockTimerProps) {
  // Color based on progress
  const getProgressColor = () => {
    if (progress < 50) return "hsl(var(--secondary))"; // Verde
    if (progress < 75) return "hsl(var(--primary))";   // Azul
    return "hsl(var(--destructive))";                   // Vermelho
  };

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (isFinished) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-2 text-secondary"
      >
        <BookOpen className="h-4 w-4" />
        <span className="text-sm font-medium">Concluído!</span>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* Circular Progress */}
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="32"
            cy="32"
            r={radius}
            stroke={getProgressColor()}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            initial={false}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-mono font-semibold text-foreground">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-secondary hover:text-secondary hover:bg-secondary/10"
            onClick={onStart}
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={onPause}
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onSkip}
          title="Pular bloco"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}