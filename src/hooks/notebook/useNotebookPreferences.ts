import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';

export interface NotebookPreferences {
  user_id: string;
  default_pen_style: string | null;
  default_pen_color: string | null;
  default_pen_width: number | null;
  fountain_pen_config: Record<string, unknown> | null;
  ball_pen_config: Record<string, unknown> | null;
  brush_pen_config: Record<string, unknown> | null;
  highlighter_config: Record<string, unknown> | null;
  eraser_size: string | null;
  eraser_mode: string | null;
  show_zoom_window: boolean | null;
  auto_advance_zoom: boolean | null;
  palm_rejection: boolean | null;
  stroke_stabilization: number | null;
  gesture_circle_to_select: boolean | null;
  gesture_scribble_to_erase: boolean | null;
  updated_at: string | null;
}

export function useNotebookPreferences() {
  return useQuery({
    queryKey: notebookKeys.preferences(),
    queryFn: async (): Promise<NotebookPreferences | null> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notebook_user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotebookPreferences | null;
    },
  });
}
