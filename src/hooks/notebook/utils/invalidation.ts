import { QueryClient } from '@tanstack/react-query';
import { notebookKeys } from '../queryKeys';

export const invalidators = {
  allNotebookLists: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: notebookKeys.lists() }),

  notebook: (qc: QueryClient, notebookId: string) => {
    qc.invalidateQueries({ queryKey: notebookKeys.detail(notebookId) });
    qc.invalidateQueries({ queryKey: notebookKeys.lists() });
  },

  notebookPages: (qc: QueryClient, notebookId: string) => {
    qc.invalidateQueries({ queryKey: notebookKeys.pages(notebookId) });
    qc.invalidateQueries({ queryKey: notebookKeys.detail(notebookId) });
  },

  page: (qc: QueryClient, notebookId: string, pageId: string) => {
    qc.invalidateQueries({ queryKey: notebookKeys.page(notebookId, pageId) });
    qc.invalidateQueries({ queryKey: notebookKeys.pages(notebookId) });
  },

  allFolders: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: notebookKeys.folders() }),

  allCollections: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: notebookKeys.elementCollections() }),

  elementsInCollection: (qc: QueryClient, collectionId: string) =>
    qc.invalidateQueries({ queryKey: notebookKeys.elementsInCollection(collectionId) }),

  preferences: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: notebookKeys.preferences() }),
};
