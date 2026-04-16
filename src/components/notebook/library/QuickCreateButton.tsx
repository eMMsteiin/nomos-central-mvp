import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickCreateButtonProps {
  onClick: () => void;
}

export function QuickCreateButton({ onClick }: QuickCreateButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
      title="Criar novo caderno"
      aria-label="Criar novo caderno"
    >
      <Plus className="w-6 h-6" />
    </motion.button>
  );
}
