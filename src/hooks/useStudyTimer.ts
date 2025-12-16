import { useState, useEffect, useCallback, useRef } from 'react';

interface UseStudyTimerProps {
  durationMinutes: number;
  startedAt?: string;
  pausedAt?: string;
  remainingOnPause?: number;
  onComplete?: () => void;
}

interface UseStudyTimerReturn {
  remainingSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  progress: number;
  start: () => void;
  pause: () => void;
  skip: () => void;
  formattedTime: string;
}

export function useStudyTimer({
  durationMinutes,
  startedAt,
  pausedAt,
  remainingOnPause,
  onComplete
}: UseStudyTimerProps): UseStudyTimerReturn {
  const totalSeconds = durationMinutes * 60;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  
  const calculateInitialRemaining = useCallback(() => {
    if (remainingOnPause !== undefined && pausedAt) {
      return remainingOnPause;
    }
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      return Math.max(0, totalSeconds - elapsed);
    }
    return totalSeconds;
  }, [startedAt, pausedAt, remainingOnPause, totalSeconds]);

  const [remainingSeconds, setRemainingSeconds] = useState(calculateInitialRemaining);
  const [isRunning, setIsRunning] = useState(!!startedAt && !pausedAt);
  const [isFinished, setIsFinished] = useState(false);

  // Update timer every second when running
  useEffect(() => {
    if (!isRunning || isFinished) return;

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsFinished(true);
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isFinished]);

  const start = useCallback(() => {
    if (isFinished) return;
    setIsRunning(true);
  }, [isFinished]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const skip = useCallback(() => {
    setRemainingSeconds(0);
    setIsFinished(true);
    setIsRunning(false);
    onCompleteRef.current?.();
  }, []);

  const progress = totalSeconds > 0 
    ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 
    : 0;

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    remainingSeconds,
    isRunning,
    isFinished,
    progress,
    start,
    pause,
    skip,
    formattedTime: formatTime(remainingSeconds)
  };
}