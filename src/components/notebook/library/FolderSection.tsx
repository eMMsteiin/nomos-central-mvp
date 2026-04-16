import { Plus } from 'lucide-react';
import { FolderCard } from './FolderCard';
import type { NotebookFolder } from '@/hooks/notebook/useNotebookFolders';

interface FolderSectionProps {
  folders: NotebookFolder[];
  onFolderClick: (folderId: string) => void;
  onNewFolder: () => void;
}

export function FolderSection({ folders, onFolderClick, onNewFolder }: FolderSectionProps) {
  if (folders.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
        Pastas
      </h2>
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`section ::-webkit-scrollbar { display: none; }`}</style>
        {folders.map((folder) => (
          <FolderCard key={folder.id} folder={folder} onClick={onFolderClick} />
        ))}
        <button
          onClick={onNewFolder}
          className="w-28 h-32 flex-shrink-0 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-500 dark:hover:border-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition flex flex-col items-center justify-center gap-1.5 text-neutral-500"
          aria-label="Nova pasta"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Nova pasta</span>
        </button>
      </div>
    </section>
  );
}
