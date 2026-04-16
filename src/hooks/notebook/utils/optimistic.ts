import { QueryClient } from '@tanstack/react-query';
import { notebookKeys } from '../queryKeys';
import type { NotebookRow } from '../useNotebooks';

export async function optimisticallyUpdateNotebook(
  qc: QueryClient,
  notebookId: string,
  updater: (old: NotebookRow) => NotebookRow
) {
  await qc.cancelQueries({ queryKey: notebookKeys.detail(notebookId) });
  await qc.cancelQueries({ queryKey: notebookKeys.lists() });

  const previousDetail = qc.getQueryData<NotebookRow>(notebookKeys.detail(notebookId));
  const previousLists = qc.getQueriesData<NotebookRow[]>({ queryKey: notebookKeys.lists() });

  if (previousDetail) {
    qc.setQueryData<NotebookRow>(notebookKeys.detail(notebookId), updater(previousDetail));
  }

  qc.setQueriesData<NotebookRow[]>(
    { queryKey: notebookKeys.lists() },
    (old) => old?.map(n => n.id === notebookId ? updater(n) : n)
  );

  return () => {
    if (previousDetail) qc.setQueryData(notebookKeys.detail(notebookId), previousDetail);
    previousLists.forEach(([key, data]) => qc.setQueryData(key, data));
  };
}
