export interface NotebookListFilters {
  folderId?: string | null;
  isFavorite?: boolean;
  searchQuery?: string;
  sortBy?: 'updated_at' | 'created_at' | 'title';
  sortDirection?: 'asc' | 'desc';
}

export const notebookKeys = {
  all: ['notebooks'] as const,

  lists: () => [...notebookKeys.all, 'list'] as const,
  list: (filters?: NotebookListFilters) =>
    [...notebookKeys.lists(), filters ?? {}] as const,

  details: () => [...notebookKeys.all, 'detail'] as const,
  detail: (id: string) => [...notebookKeys.details(), id] as const,

  pages: (notebookId: string) =>
    [...notebookKeys.detail(notebookId), 'pages'] as const,
  page: (notebookId: string, pageId: string) =>
    [...notebookKeys.pages(notebookId), pageId] as const,

  folders: () => ['notebook-folders'] as const,
  folder: (id: string) => [...notebookKeys.folders(), id] as const,

  elementCollections: () => ['notebook-element-collections'] as const,
  elementsInCollection: (collectionId: string) =>
    ['notebook-elements', 'collection', collectionId] as const,

  paperTemplates: () => ['notebook-paper-templates'] as const,

  preferences: () => ['notebook-preferences'] as const,
};
