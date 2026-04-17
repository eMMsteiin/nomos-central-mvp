import { X, Star, FolderInput, Copy, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SelectionToolbarProps {
  selectedCount: number;
  onCancel: () => void;
  onFavoriteAll: () => void;
  onMoveAll: () => void;
  onDuplicateAll: () => void;
  onDeleteAll: () => void;
}

export function SelectionToolbar({
  selectedCount,
  onCancel,
  onFavoriteAll,
  onMoveAll,
  onDuplicateAll,
  onDeleteAll,
}: SelectionToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
    >
      <button
        onClick={onCancel}
        className="p-1.5 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition"
        title="Cancelar seleção (Esc)"
        aria-label="Cancelar seleção"
      >
        <X className="w-4 h-4" />
      </button>

      <span className="text-sm font-medium">
        {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
      </span>

      <div className="flex-1" />

      <button
        onClick={onFavoriteAll}
        className="p-2 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition"
        title="Favoritar todos"
        aria-label="Favoritar todos"
      >
        <Star className="w-4 h-4" />
      </button>
      <button
        onClick={onMoveAll}
        className="p-2 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition"
        title="Mover todos"
        aria-label="Mover todos"
      >
        <FolderInput className="w-4 h-4" />
      </button>
      <button
        onClick={onDuplicateAll}
        className="p-2 rounded-md hover:bg-white/10 dark:hover:bg-black/10 transition"
        title="Duplicar todos"
        aria-label="Duplicar todos"
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        onClick={onDeleteAll}
        className="p-2 rounded-md hover:bg-red-500/20 transition"
        title="Excluir todos"
        aria-label="Excluir todos"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
