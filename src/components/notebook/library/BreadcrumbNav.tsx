import { ChevronRight } from 'lucide-react';
import type { NotebookFolder } from '@/hooks/notebook/useNotebookFolders';

interface BreadcrumbNavProps {
  currentFolder: NotebookFolder | null;
  onNavigateToRoot: () => void;
}

export function BreadcrumbNav({ currentFolder, onNavigateToRoot }: BreadcrumbNavProps) {
  if (!currentFolder) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-3" aria-label="Breadcrumb">
      <button
        onClick={onNavigateToRoot}
        className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition"
      >
        Caderno
      </button>
      <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
      <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate max-w-[200px]">
        {currentFolder.name}
      </span>
    </nav>
  );
}
