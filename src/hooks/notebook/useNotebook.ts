import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';
import type { NotebookRow } from './useNotebooks';

export function useNotebook(notebookId: string | undefined) {
  return useQuery({
    queryKey: notebookId ? notebookKeys.detail(notebookId) : ['notebook-disabled'],
    queryFn: async (): Promise<NotebookRow> => {
      if (!notebookId) throw new Error('notebookId required');

      const { data, error } = await supabase
        .from('notebooks')
        .select('*, notebook_pages(count)')
        .eq('id', notebookId)
        .single();

      if (error) throw error;

      return {
        ...(data as any),
        page_count: Array.isArray((data as any).notebook_pages)
          ? ((data as any).notebook_pages[0]?.count ?? 0)
          : 0,
        notebook_pages: undefined,
      };
    },
    enabled: !!notebookId,
  });
}
