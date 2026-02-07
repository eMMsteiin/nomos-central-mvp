import { useFocusMode } from '@/hooks/useFocusMode';
import { Button } from '@/components/ui/button';
import { X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FocusStatusBar() {
  const { state, remainingFormatted, endTimeFormatted, endSession } = useFocusMode();

  if (!state.active) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-foreground text-background"
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wider">Foco</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3 w-3" />
              <span className="font-mono font-medium">{remainingFormatted}</span>
              {endTimeFormatted && (
                <span className="text-background/70 text-xs">
                  até {endTimeFormatted}
                </span>
              )}
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => endSession('ended_early')}
              className="gap-1 h-6 text-xs text-background hover:text-background hover:bg-background/10"
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
