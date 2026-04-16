import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreateNotebook } from '@/hooks/notebook/mutations/useNotebookMutations';

export function QuickCreateButton() {
  const createNotebook = useCreateNotebook();

  const handleQuickCreate = () => {
    createNotebook.mutate({
      title: `Caderno ${new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      create_first_page: true,
    });
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleQuickCreate}
      disabled={createNotebook.isPending}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow disabled:opacity-50"
      title="Criar novo caderno"
      aria-label="Criar novo caderno"
    >
      {createNotebook.isPending ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <Plus className="w-6 h-6" />
      )}
    </motion.button>
  );
}
