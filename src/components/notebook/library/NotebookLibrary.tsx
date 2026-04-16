import { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useNotebooks } from '@/hooks/notebook/useNotebooks';
import { useNotebookFolders } from '@/hooks/notebook/useNotebookFolders';
import type { NotebookListFilters } from '@/hooks/notebook/queryKeys';
import { LibraryToolbar } from './LibraryToolbar';
import { NotebookGrid } from './NotebookGrid';
import { LibraryEmptyState } from './LibraryEmptyState';
import { QuickCreateButton } from './QuickCreateButton';
import { FolderSection } from './FolderSection';
import { BreadcrumbNav } from './BreadcrumbNav';
import { NewNotebookDialog } from './NewNotebookDialog';
import { NewFolderDialog } from './NewFolderDialog';

type Tab = 'all' | 'favorites' | 'recent';
type SortBy = 'updated_at' | 'created_at' | 'title';
type SortDir = 'asc' | 'desc';

export function NotebookLibrary() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newNotebookOpen, setNewNotebookOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  const filters = useMemo<NotebookListFilters>(() => ({
    folderId: currentFolderId,
    isFavorite: activeTab === 'favorites' ? true : undefined,
    searchQuery: searchQuery || undefined,
    sortBy,
    sortDirection,
  }), [currentFolderId, activeTab, searchQuery, sortBy, sortDirection]);

  const { data: notebooks, isLoading, error } = useNotebooks(filters);
  const { data: rootFolders } = useNotebookFolders(null);

  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return rootFolders?.find((f) => f.id === currentFolderId) ?? null;
  }, [currentFolderId, rootFolders]);

  const displayedNotebooks = useMemo(() => {
    if (!notebooks) return [];
    if (activeTab === 'recent') {
      return [...notebooks]
        .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
        .slice(0, 10);
    }
    return notebooks;
  }, [notebooks, activeTab]);

  const isInFolder = currentFolderId !== null;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-7xl mx-auto p-6">
        <LibraryToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          title={currentFolder?.name ?? 'Caderno'}
          showNewFolderButton={!isInFolder}
          onNewFolder={() => setNewFolderOpen(true)}
        />

        <div className="mt-6">
          <BreadcrumbNav
            currentFolder={currentFolder}
            onNavigateToRoot={() => setCurrentFolderId(null)}
          />

          {!isInFolder && rootFolders && rootFolders.length > 0 && (
            <FolderSection
              folders={rootFolders}
              onFolderClick={setCurrentFolderId}
              onNewFolder={() => setNewFolderOpen(true)}
            />
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-neutral-500">
                Erro ao carregar cadernos. Tente recarregar a página.
              </p>
            </div>
          ) : displayedNotebooks.length === 0 ? (
            <LibraryEmptyState
              hasSearch={!!searchQuery}
              activeTab={activeTab}
              isInFolder={isInFolder}
            />
          ) : (
            <NotebookGrid
              notebooks={displayedNotebooks}
              viewMode={viewMode}
              currentFolderId={currentFolderId}
            />
          )}
        </div>
      </div>

      <QuickCreateButton onClick={() => setNewNotebookOpen(true)} />

      <NewNotebookDialog
        open={newNotebookOpen}
        onOpenChange={setNewNotebookOpen}
        defaultFolderId={currentFolderId}
      />
      <NewFolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} />
    </div>
  );
}
