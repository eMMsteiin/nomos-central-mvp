import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';

export interface NotebookPageSummary {
  id: string;
  notebook_id: string;
  page_index: number;
  paper_template: string | null;
  paper_config: Record<string, unknown> | null;
  background_image_url: string | null;
  is_bookmarked: boolean | null;
  outline_title: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useNotebookPages(notebookId: string | undefined) {
  return useQuery({
    queryKey: notebookId ? notebookKeys.pages(notebookId) : ['pages-disabled'],
    queryFn: async (): Promise<NotebookPageSummary[]> => {
      if (!notebookId) throw new Error('notebookId required');

      const { data, error } = await supabase
        .from('notebook_pages')
        .select(
          'id, notebook_id, page_index, paper_template, paper_config, background_image_url, is_bookmarked, outline_title, created_at, updated_at'
        )
        .eq('notebook_id', notebookId)
        .order('page_index', { ascending: true });

      if (error) throw error;
      return (data ?? []) as NotebookPageSummary[];
    },
    enabled: !!notebookId,
  });
}
