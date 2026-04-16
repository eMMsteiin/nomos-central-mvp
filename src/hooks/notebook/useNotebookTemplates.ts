import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';

export interface PaperTemplate {
  id: string;
  user_id: string | null;
  name: string;
  template_type: string;
  template_data: string;
  is_builtin: boolean | null;
  group_name: string | null;
  created_at: string | null;
}

export function usePaperTemplates(type?: 'cover' | 'paper') {
  return useQuery({
    queryKey: [...notebookKeys.paperTemplates(), type ?? 'all'],
    queryFn: async (): Promise<PaperTemplate[]> => {
      let query = supabase
        .from('notebook_paper_templates')
        .select('*')
        .order('is_builtin', { ascending: false })
        .order('group_name', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      if (type) {
        query = query.eq('template_type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PaperTemplate[];
    },
    staleTime: 10 * 60_000,
  });
}
