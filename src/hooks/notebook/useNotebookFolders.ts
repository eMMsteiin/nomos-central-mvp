import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';

export interface NotebookFolder {
  id: string;
  user_id: string;
  parent_folder_id: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  position: number | null;
  created_at: string | null;
  updated_at: string | null;
  notebook_count?: number;
}

export function useNotebookFolders(parentFolderId?: string | null) {
  return useQuery({
    queryKey: [...notebookKeys.folders(), parentFolderId ?? 'root'],
    queryFn: async (): Promise<NotebookFolder[]> => {
      let query = supabase
        .from('notebook_folders')
        .select('*, notebooks(count)')
        .order('position', { ascending: true });

      if (parentFolderId === undefined || parentFolderId === null) {
        query = query.is('parent_folder_id', null);
      } else {
        query = query.eq('parent_folder_id', parentFolderId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((f: any) => ({
        ...f,
        notebook_count: Array.isArray(f.notebooks)
          ? (f.notebooks[0]?.count ?? 0)
          : 0,
        notebooks: undefined,
      }));
    },
  });
}
