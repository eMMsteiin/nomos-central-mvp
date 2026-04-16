import { motion } from 'framer-motion';
import { NotebookCard } from './NotebookCard';
import type { NotebookRow } from '@/hooks/notebook/useNotebooks';

interface NotebookGridProps {
  notebooks: NotebookRow[];
  viewMode: 'grid' | 'list';
  currentFolderId?: string | null;
}

export function NotebookGrid({ notebooks, viewMode, currentFolderId = null }: NotebookGridProps) {
  return (
    <div
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
          : 'flex flex-col gap-2'
      }
    >
      {notebooks.map((notebook, index) => (
        <motion.div
          key={notebook.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
        >
          <NotebookCard
            notebook={notebook}
            viewMode={viewMode}
            currentFolderId={currentFolderId}
          />
        </motion.div>
      ))}
    </div>
  );
}
