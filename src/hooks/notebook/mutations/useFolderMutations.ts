import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';
import type { NotebookFolder } from '../useNotebookFolders';

interface CreateFolderInput {
  name: string;
  color?: string;
  icon?: string;
  parent_folder_id?: string | null;
}

export function useCreateFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFolderInput): Promise<NotebookFolder> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notebook_folders')
        .insert({
          user_id: user.id,
          name: input.name,
          color: input.color ?? '#9B9B9B',
          icon: input.icon ?? 'Folder',
          parent_folder_id: input.parent_folder_id ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, notebook_count: 0 } as NotebookFolder;
    },
    onSuccess: () => {
      invalidators.allFolders(qc);
    },
  });
}

interface UpdateFolderInput {
  id: string;
  patch: Partial<Pick<NotebookFolder, 'name' | 'color' | 'icon' | 'parent_folder_id' | 'position'>>;
}

export function useUpdateFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateFolderInput) => {
      const { error } = await supabase
        .from('notebook_folders')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allFolders(qc);
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ folderId, notebookAction }: { folderId: string; notebookAction: 'move_to_root' | 'delete_all' }) => {
      if (notebookAction === 'move_to_root') {
        const { error: moveError } = await supabase
          .from('notebooks').update({ folder_id: null }).eq('folder_id', folderId);
        if (moveError) throw moveError;
      } else if (notebookAction === 'delete_all') {
        const { error: deleteError } = await supabase
          .from('notebooks').delete().eq('folder_id', folderId);
        if (deleteError) throw deleteError;
      }

      const { error } = await supabase.from('notebook_folders').delete().eq('id', folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allFolders(qc);
      invalidators.allNotebookLists(qc);
    },
  });
}
