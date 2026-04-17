import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';

export function useBulkFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, isFavorite }: { ids: string[]; isFavorite: boolean }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notebooks')
        .update({ is_favorite: isFavorite })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
    },
  });
}

export function useBulkMoveToFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string | null }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from('notebooks')
        .update({ folder_id: folderId })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
      invalidators.allFolders(qc);
    },
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('notebooks').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
      invalidators.allFolders(qc);
    },
  });
}

export function useBulkDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      for (const id of ids) {
        const { data: original } = await supabase
          .from('notebooks').select('*').eq('id', id).single();
        if (!original) continue;

        const { id: _oldId, created_at: _ca, updated_at: _ua, ...rest } = original;
        const { data: copy, error: insertError } = await supabase
          .from('notebooks')
          .insert({ ...rest, title: `${original.title} (cópia)`, page_order: [] })
          .select()
          .single();
        if (insertError || !copy) continue;

        const { data: pages } = await supabase
          .from('notebook_pages').select('*').eq('notebook_id', id);

        if (pages && pages.length > 0) {
          const pagesToInsert = pages.map((p: any) => {
            const { id: _pid, notebook_id: _nid, created_at: _pca, updated_at: _pua, ...pageRest } = p;
            return { ...pageRest, notebook_id: copy.id };
          });
          await supabase.from('notebook_pages').insert(pagesToInsert);
        }
      }
    },
    onSuccess: () => {
      invalidators.allNotebookLists(qc);
    },
  });
}
