import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';
import { notebookKeys } from '../queryKeys';
import type { NotebookPageFull } from '../useNotebookPage';

interface CreatePageInput {
  notebook_id: string;
  page_index?: number;
  paper_template?: string;
  paper_config?: Record<string, unknown>;
  background_image_url?: string | null;
}

export function useCreateNotebookPage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePageInput) => {
      let pageIndex = input.page_index;
      if (pageIndex === undefined) {
        const { data: lastPage } = await supabase
          .from('notebook_pages')
          .select('page_index')
          .eq('notebook_id', input.notebook_id)
          .order('page_index', { ascending: false })
          .limit(1)
          .maybeSingle();
        pageIndex = lastPage ? lastPage.page_index + 1 : 0;
      }

      const { data, error } = await supabase
        .from('notebook_pages')
        .insert([{
          notebook_id: input.notebook_id,
          page_index: pageIndex,
          paper_template: input.paper_template ?? 'blank',
          paper_config: input.paper_config ?? {},
          background_image_url: input.background_image_url ?? null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { notebook_id }) => {
      invalidators.notebookPages(qc, notebook_id);
    },
  });
}

interface UpdatePageContentInput {
  notebook_id: string;
  page_id: string;
  patch: Partial<Pick<NotebookPageFull,
    'strokes' | 'text_boxes' | 'shapes' | 'images' | 'elements'
    | 'highlights' | 'is_bookmarked' | 'outline_title' | 'paper_template'
    | 'paper_config' | 'background_image_url'
  >>;
}

export function useUpdateNotebookPage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ page_id, patch }: UpdatePageContentInput) => {
      const { data, error } = await supabase
        .from('notebook_pages')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', page_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ notebook_id, page_id, patch }) => {
      await qc.cancelQueries({ queryKey: notebookKeys.page(notebook_id, page_id) });
      const previous = qc.getQueryData<NotebookPageFull>(notebookKeys.page(notebook_id, page_id));
      if (previous) {
        qc.setQueryData<NotebookPageFull>(notebookKeys.page(notebook_id, page_id), { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, { notebook_id, page_id }, context) => {
      if (context?.previous) {
        qc.setQueryData(notebookKeys.page(notebook_id, page_id), context.previous);
      }
    },
    onSettled: (_data, _err, { notebook_id, page_id }) => {
      invalidators.page(qc, notebook_id, page_id);
    },
  });
}

export function useDeleteNotebookPage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ notebook_id, page_id }: { notebook_id: string; page_id: string }) => {
      const { error } = await supabase.from('notebook_pages').delete().eq('id', page_id);
      if (error) throw error;
      return { notebook_id };
    },
    onSuccess: (_data, { notebook_id }) => {
      invalidators.notebookPages(qc, notebook_id);
    },
  });
}

interface ReorderPagesInput {
  notebook_id: string;
  reorderedPages: Array<{ id: string; page_index: number }>;
}

export function useReorderNotebookPages() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ reorderedPages }: ReorderPagesInput) => {
      // Phase 1: move to negative indices to avoid UNIQUE conflicts
      for (let i = 0; i < reorderedPages.length; i++) {
        const { error } = await supabase
          .from('notebook_pages')
          .update({ page_index: -(i + 1) })
          .eq('id', reorderedPages[i].id);
        if (error) throw error;
      }
      // Phase 2: set final indices
      for (const page of reorderedPages) {
        const { error } = await supabase
          .from('notebook_pages')
          .update({ page_index: page.page_index })
          .eq('id', page.id);
        if (error) throw error;
      }
    },
    onSuccess: (_data, { notebook_id }) => {
      invalidators.notebookPages(qc, notebook_id);
    },
  });
}
