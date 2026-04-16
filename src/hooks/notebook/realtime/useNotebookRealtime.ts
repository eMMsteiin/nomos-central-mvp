import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';

export function useNotebookRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const notebooksChannel = supabase
        .channel(`notebooks:user=${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notebooks',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notebookId = (payload.new as { id?: string })?.id
              ?? (payload.old as { id?: string })?.id;
            invalidators.allNotebookLists(qc);
            if (notebookId) invalidators.notebook(qc, notebookId);
          }
        )
        .subscribe();

      const pagesChannel = supabase
        .channel('notebook_pages:all')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notebook_pages' },
          (payload) => {
            const notebookId = (payload.new as { notebook_id?: string })?.notebook_id
              ?? (payload.old as { notebook_id?: string })?.notebook_id;
            const pageId = (payload.new as { id?: string })?.id
              ?? (payload.old as { id?: string })?.id;

            if (notebookId) {
              invalidators.notebookPages(qc, notebookId);
              if (pageId) invalidators.page(qc, notebookId, pageId);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notebooksChannel);
        supabase.removeChannel(pagesChannel);
      };
    };

    let cleanup: (() => void) | undefined;
    setup().then(c => { cleanup = c; });

    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [qc]);
}
