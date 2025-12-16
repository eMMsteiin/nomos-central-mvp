import { motion } from "framer-motion";
import { BookOpen, Clock } from "lucide-react";
import { Task } from "@/types/task";
import { useStudyTimer } from "@/hooks/useStudyTimer";
import { StudyBlockTimer } from "./StudyBlockTimer";

interface StudyBlockItemProps {
  task: Task;
  index: number;
  isCompleting: boolean;
  onComplete: () => void;
  onTimerStateChange: (updates: Partial<Task>) => void;
}

export function StudyBlockItem({
  task,
  index,
  isCompleting,
  onComplete,
  onTimerStateChange
}: StudyBlockItemProps) {
  const { 
    formattedTime, 
    progress, 
    isRunning, 
    isFinished,
    remainingSeconds,
    start, 
    pause, 
    skip 
  } = useStudyTimer({
    durationMinutes: task.durationMinutes || 60,
    startedAt: task.timerStartedAt,
    pausedAt: task.timerPausedAt,
    remainingOnPause: task.timerRemainingSeconds,
    onComplete
  });

  const handleStart = () => {
    start();
    onTimerStateChange({
      timerStartedAt: new Date().toISOString(),
      timerPausedAt: undefined,
      timerRemainingSeconds: undefined
    });
  };

  const handlePause = () => {
    pause();
    onTimerStateChange({
      timerPausedAt: new Date().toISOString(),
      timerRemainingSeconds: remainingSeconds
    });
  };

  const handleSkip = () => {
    skip();
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return mins > 0 ? `${hrs}h${mins}` : `${hrs}h`;
    }
    return `${mins}min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={
        isCompleting || isFinished
          ? {
              opacity: 0,
              scale: 0.9,
              x: 100,
              transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
            }
          : {
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
                delay: index * 0.03
              }
            }
      }
      exit={{ opacity: 0, scale: 0.9, x: 100, transition: { duration: 0.3 } }}
      className="bg-primary/5 border border-primary/20 rounded-lg p-4 hover:bg-primary/10 transition-all duration-200"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">
              {task.text}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {task.startTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.startTime}
                  {task.endTime && ` - ${task.endTime}`}
                </span>
              )}
              {task.durationMinutes && (
                <>
                  {task.startTime && <span>•</span>}
                  <span>{formatDuration(task.durationMinutes)}</span>
                </>
              )}
              {task.focusSubject && (
                <>
                  <span>•</span>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                    {task.focusSubject}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Timer */}
        <StudyBlockTimer
          formattedTime={formattedTime}
          progress={progress}
          isRunning={isRunning}
          isFinished={isFinished}
          onStart={handleStart}
          onPause={handlePause}
          onSkip={handleSkip}
        />
      </div>
    </motion.div>
  );
}