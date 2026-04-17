import { useState, useMemo, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNotebooks } from '@/hooks/notebook/useNotebooks';
import { useNotebookFolders } from '@/hooks/notebook/useNotebookFolders';
import {
  useBulkFavorite,
  useBulkMoveToFolder,
  useBulkDelete,
  useBulkDuplicate,
} from '@/hooks/notebook/mutations/useBulkNotebookMutations';
import type { NotebookListFilters } from '@/hooks/notebook/queryKeys';
import { LibraryToolbar } from './LibraryToolbar';
import { NotebookGrid } from './NotebookGrid';
import { LibraryEmptyState } from './LibraryEmptyState';
import { QuickCreateButton } from './QuickCreateButton';
import { FolderSection } from './FolderSection';
import { BreadcrumbNav } from './BreadcrumbNav';
import { NewNotebookDialog } from './NewNotebookDialog';
import { NewFolderDialog } from './NewFolderDialog';
import { DndWrapper } from './DndWrapper';
import { SelectionToolbar } from './SelectionToolbar';
import { BulkMoveDialog } from './BulkMoveDialog';
import { RootDropZone } from './RootDropZone';

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const filters = useMemo<NotebookListFilters>(() => ({
    folderId: currentFolderId,
    isFavorite: activeTab === 'favorites' ? true : undefined,
    searchQuery: searchQuery || undefined,
    sortBy,
    sortDirection,
  }), [currentFolderId, activeTab, searchQuery, sortBy, sortDirection]);

  const { data: notebooks, isLoading, error } = useNotebooks(filters);
  const { data: rootFolders } = useNotebookFolders(null);

  const bulkFavorite = useBulkFavorite();
  const bulkMove = useBulkMoveToFolder();
  const bulkDelete = useBulkDelete();
  const bulkDuplicate = useBulkDuplicate();

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
  const isSelectionMode = selectedIds.size > 0;
  const totalCount = notebooks?.length ?? 0;

  const clearSelection = () => setSelectedIds(new Set());

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Scroll to top when changing tab/folder
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, currentFolderId]);

  // Clear selection when changing folder/tab
  useEffect(() => {
    clearSelection();
  }, [currentFolderId, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !inField) {
        e.preventDefault();
        setNewNotebookOpen(true);
        return;
      }
      if (e.key === 'Escape' && isSelectionMode) {
        clearSelection();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && isSelectionMode && !inField) {
        e.preventDefault();
        setSelectedIds(new Set(displayedNotebooks.map((n) => n.id)));
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && isSelectionMode && !inField) {
        e.preventDefault();
        handleBulkDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelectionMode, displayedNotebooks]);

  const handleBulkFavorite = () => {
    const ids = Array.from(selectedIds);
    bulkFavorite.mutate(
      { ids, isFavorite: true },
      {
        onSuccess: () => {
          toast.success(`${ids.length} ${ids.length === 1 ? 'caderno favoritado' : 'cadernos favoritados'}`);
          clearSelection();
        },
        onError: () => toast.error('Falha ao favoritar'),
      }
    );
  };

  const handleBulkDuplicate = () => {
    const ids = Array.from(selectedIds);
    bulkDuplicate.mutate(ids, {
      onSuccess: () => {
        toast.success(`${ids.length} ${ids.length === 1 ? 'caderno duplicado' : 'cadernos duplicados'}`);
        clearSelection();
      },
      onError: () => toast.error('Falha ao duplicar'),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} ${ids.length === 1 ? 'caderno' : 'cadernos'}? Esta ação não pode ser desfeita.`)) return;
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        toast.success(`${ids.length} ${ids.length === 1 ? 'caderno excluído' : 'cadernos excluídos'}`);
        clearSelection();
      },
      onError: () => toast.error('Falha ao excluir'),
    });
  };

  const handleBulkMoveConfirm = async (folderId: string | null, folderName: string) => {
    const ids = Array.from(selectedIds);
    bulkMove.mutate(
      { ids, folderId },
      {
        onSuccess: () => {
          toast.success(`${ids.length} ${ids.length === 1 ? 'caderno movido' : 'cadernos movidos'} para ${folderName}`);
          clearSelection();
        },
        onError: () => toast.error('Falha ao mover'),
      }
    );
  };

  return (
    <div ref={contentRef} className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {isSelectionMode ? (
            <SelectionToolbar
              key="selection"
              selectedCount={selectedIds.size}
              onCancel={clearSelection}
              onFavoriteAll={handleBulkFavorite}
              onMoveAll={() => setBulkMoveOpen(true)}
              onDuplicateAll={handleBulkDuplicate}
              onDeleteAll={handleBulkDelete}
            />
          ) : (
            <LibraryToolbar
              key="toolbar"
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
              titleCount={totalCount}
              showNewFolderButton={!isInFolder}
              onNewFolder={() => setNewFolderOpen(true)}
            />
          )}
        </AnimatePresence>

        <DndWrapper notebooks={displayedNotebooks} folders={rootFolders ?? []}>
          <div className="mt-6">
            <BreadcrumbNav
              currentFolder={currentFolder}
              onNavigateToRoot={() => setCurrentFolderId(null)}
            />

            <RootDropZone active={isInFolder} />

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
                isSelectionMode={isSelectionMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
              />
            )}
          </div>
        </DndWrapper>
      </div>

      <QuickCreateButton onClick={() => setNewNotebookOpen(true)} />

      <NewNotebookDialog
        open={newNotebookOpen}
        onOpenChange={setNewNotebookOpen}
        defaultFolderId={currentFolderId}
      />
      <NewFolderDialog open={newFolderOpen} onOpenChange={setNewFolderOpen} />
      <BulkMoveDialog
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        count={selectedIds.size}
        onConfirm={handleBulkMoveConfirm}
        isPending={bulkMove.isPending}
      />
    </div>
  );
}
