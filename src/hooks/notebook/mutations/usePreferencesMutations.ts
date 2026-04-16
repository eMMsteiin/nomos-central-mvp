import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';
import type { NotebookPreferences } from '../useNotebookPreferences';

export function useUpsertNotebookPreferences() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<NotebookPreferences, 'user_id' | 'updated_at'>>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notebook_user_preferences')
        .upsert(
          { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as NotebookPreferences;
    },
    onSuccess: () => {
      invalidators.preferences(qc);
    },
  });
}
