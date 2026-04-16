import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';
import { optimisticallyUpdateNotebook } from '../utils/optimistic';
import type { NotebookRow } from '../useNotebooks';

interface CreateNotebookInput {
  title: string;
  subject?: string;
  discipline?: string;
  folder_id?: string | null;
  cover_type?: string;
  cover_data?: string | null;
  default_paper_template?: string;
  scroll_direction?: string;
  create_first_page?: boolean;
  first_page_template?: string;
}

export function useCreateNotebook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNotebookInput): Promise<NotebookRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: notebook, error } = await supabase
        .from('notebooks')
        .insert({
          user_id: user.id,
          title: input.title,
          subject: input.subject ?? null,
          discipline: input.discipline ?? null,
          folder_id: input.folder_id ?? null,
          cover_type: input.cover_type ?? 'default',
          cover_data: input.cover_data ?? null,
          default_paper_template: input.default_paper_template ?? 'blank',
          scroll_direction: input.scroll_direction ?? 'vertical',
        })
        .select()
        .single();

      if (error) throw error;

      if (input.create_first_page !== false) {
        const { error: pageError } = await supabase
          .from('notebook_pages')
          .insert({
            notebook_id: notebook.id,
            page_index: 0,
            paper_template: input.first_page_template ?? input.default_paper_template ?? 'blank',
          });

        if (pageError) {
          await supabase.from('notebooks').delete().eq('id', notebook.id);
          throw new Error('Falha ao criar primeira página: ' + pageError.message);
        }
      }

      return { ...notebook, page_count: 1 } as NotebookRow;
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
    },
  });
}

interface UpdateNotebookInput {
  id: string;
  patch: Partial<Pick<NotebookRow,
    'title' | 'subject' | 'discipline' | 'cover_type' | 'cover_data'
    | 'default_paper_template' | 'scroll_direction' | 'folder_id' | 'tags' | 'summary'
  >>;
}

export function useUpdateNotebook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateNotebookInput) => {
      const { data, error } = await supabase
        .from('notebooks')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as NotebookRow;
    },
    onMutate: async ({ id, patch }) => {
      const rollback = await optimisticallyUpdateNotebook(qc, id, (old) => ({ ...old, ...patch }));
      return { rollback };
    },
    onError: (_err, _vars, context) => {
      context?.rollback?.();
    },
    onSettled: (_data, _err, { id }) => {
      invalidators.notebook(qc, id);
    },
  });
}

export function useDeleteNotebook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notebookId: string) => {
      const { error } = await supabase.from('notebooks').delete().eq('id', notebookId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
    },
  });
}

export function useToggleNotebookFavorite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from('notebooks').update({ is_favorite }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_favorite }) => {
      const rollback = await optimisticallyUpdateNotebook(qc, id, (old) => ({ ...old, is_favorite }));
      return { rollback };
    },
    onError: (_err, _vars, context) => {
      context?.rollback?.();
    },
    onSettled: (_data, _err, { id }) => {
      invalidators.notebook(qc, id);
    },
  });
}

export function useDuplicateNotebook() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notebookId: string): Promise<NotebookRow> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: original, error: fetchError } = await supabase
        .from('notebooks').select('*').eq('id', notebookId).single();
      if (fetchError) throw fetchError;

      const { id: _id, created_at: _c, updated_at: _u, ...rest } = original;
      const { data: duplicated, error: insertError } = await supabase
        .from('notebooks')
        .insert({ ...rest, title: `${original.title} (cópia)`, page_order: [] })
        .select()
        .single();
      if (insertError) throw insertError;

      const { data: pages, error: pagesError } = await supabase
        .from('notebook_pages').select('*').eq('notebook_id', notebookId)
        .order('page_index', { ascending: true });
      if (pagesError) throw pagesError;

      if (pages && pages.length > 0) {
        const pagesToInsert = pages.map(p => {
          const { id: _pId, notebook_id: _nId, created_at: _pC, updated_at: _pU, ...pageRest } = p;
          return { ...pageRest, notebook_id: duplicated.id };
        });
        const { error: copyError } = await supabase.from('notebook_pages').insert(pagesToInsert);
        if (copyError) {
          await supabase.from('notebooks').delete().eq('id', duplicated.id);
          throw copyError;
        }
      }

      return duplicated as NotebookRow;
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
    },
  });
}

export function useMoveNotebookToFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ notebookId, folderId }: { notebookId: string; folderId: string | null }) => {
      const { error } = await supabase.from('notebooks').update({ folder_id: folderId }).eq('id', notebookId);
      if (error) throw error;
    },
    onSuccess: (_data, { notebookId }) => {
      invalidators.notebook(qc, notebookId);
      invalidators.allFolders(qc);
    },
  });
}
