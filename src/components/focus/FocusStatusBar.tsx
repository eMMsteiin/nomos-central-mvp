import { useFocusMode } from '@/hooks/useFocusMode';
import { Button } from '@/components/ui/button';
import { Focus, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FocusStatusBar() {
  const { state, remainingFormatted, endTimeFormatted, endSession } = useFocusMode();

  if (!state.active) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg"
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Focus className="h-4 w-4 animate-pulse" />
            <span className="font-medium text-sm">Modo Foco ativo</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold">{remainingFormatted}</span>
              {endTimeFormatted && (
                <span className="text-primary-foreground/80">
                  (até {endTimeFormatted})
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={() => endSession('ended_early')}
              className="gap-1 h-7 text-xs"
            >
              <X className="h-3 w-3" />
              Encerrar
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
