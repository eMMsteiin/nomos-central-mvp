import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
  t?: number;
}

export interface Stroke {
  id: string;
  tool: 'pen' | 'highlighter';
  penStyle?: 'fountain' | 'ballpoint' | 'brush';
  color: string;
  width: number;
  points: StrokePoint[];
}

export interface TextBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  locked?: boolean;
  linkedTaskId?: string | null;
}

export interface ShapeData {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  text?: string;
}

export interface ImageData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  url: string;
  crop?: { x: number; y: number; width: number; height: number };
}

export interface ElementInstance {
  id: string;
  element_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  data: unknown;
}

export interface NotebookPageFull {
  id: string;
  notebook_id: string;
  page_index: number;
  paper_template: string;
  paper_config: Record<string, unknown>;
  background_image_url: string | null;
  is_bookmarked: boolean;
  outline_title: string | null;
  strokes: Stroke[];
  text_boxes: TextBox[];
  shapes: ShapeData[];
  images: ImageData[];
  elements: ElementInstance[];
  highlights: Stroke[];
  created_at: string;
  updated_at: string;
}

const safeArray = (v: unknown) => (Array.isArray(v) ? v : []);
const safeObj = (v: unknown) =>
  typeof v === 'object' && v !== null ? v : {};

export function useNotebookPage(
  notebookId: string | undefined,
  pageId: string | undefined
) {
  return useQuery({
    queryKey:
      notebookId && pageId
        ? notebookKeys.page(notebookId, pageId)
        : ['page-disabled'],
    queryFn: async (): Promise<NotebookPageFull> => {
      if (!pageId) throw new Error('pageId required');

      const { data, error } = await supabase
        .from('notebook_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) throw error;

      return {
        ...data,
        strokes: safeArray(data.strokes),
        text_boxes: safeArray(data.text_boxes),
        shapes: safeArray(data.shapes),
        images: safeArray(data.images),
        elements: safeArray(data.elements),
        highlights: safeArray(data.highlights),
        paper_config: safeObj(data.paper_config),
      } as NotebookPageFull;
    },
    enabled: !!notebookId && !!pageId,
    staleTime: 60_000,
  });
}
