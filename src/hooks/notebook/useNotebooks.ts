import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys, type NotebookListFilters } from './queryKeys';

export interface NotebookRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  subject: string | null;
  discipline: string | null;
  cover_type: string | null;
  cover_data: string | null;
  default_paper_template: string | null;
  scroll_direction: string | null;
  is_favorite: boolean | null;
  is_pdf_import: boolean | null;
  page_order: string[] | null;
  tags: string[] | null;
  summary: string | null;
  created_at: string | null;
  updated_at: string | null;
  page_count?: number;
}

export function useNotebooks(filters?: NotebookListFilters) {
  return useQuery({
    queryKey: notebookKeys.list(filters),
    queryFn: async (): Promise<NotebookRow[]> => {
      let query = supabase
        .from('notebooks')
        .select('*, notebook_pages(count)');

      if (filters?.folderId === null) {
        query = query.is('folder_id', null);
      } else if (typeof filters?.folderId === 'string') {
        query = query.eq('folder_id', filters.folderId);
      }

      if (filters?.isFavorite !== undefined) {
        query = query.eq('is_favorite', filters.isFavorite);
      }

      if (filters?.searchQuery?.trim()) {
        const q = filters.searchQuery.trim();
        query = query.or(
          `title.ilike.%${q}%,discipline.ilike.%${q}%,subject.ilike.%${q}%`
        );
      }

      const sortBy = filters?.sortBy ?? 'updated_at';
      const sortDir = filters?.sortDirection ?? 'desc';
      query = query.order(sortBy, { ascending: sortDir === 'asc' });

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((n: any) => ({
        ...n,
        page_count: Array.isArray(n.notebook_pages)
          ? (n.notebook_pages[0]?.count ?? 0)
          : 0,
        notebook_pages: undefined,
      }));
    },
  });
}
