import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notebookKeys } from './queryKeys';

export interface ElementCollection {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  position: number | null;
  is_builtin: boolean | null;
  created_at: string | null;
  element_count?: number;
}

export interface ElementData {
  id: string;
  user_id: string;
  collection_id: string | null;
  name: string | null;
  thumbnail_url: string | null;
  element_data: unknown;
  position: number | null;
  created_at: string | null;
}

export function useElementCollections() {
  return useQuery({
    queryKey: notebookKeys.elementCollections(),
    queryFn: async (): Promise<ElementCollection[]> => {
      const { data, error } = await supabase
        .from('notebook_element_collections')
        .select('*, notebook_elements(count)')
        .order('is_builtin', { ascending: false })
        .order('position', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((c: any) => ({
        ...c,
        element_count: Array.isArray(c.notebook_elements)
          ? (c.notebook_elements[0]?.count ?? 0)
          : 0,
        notebook_elements: undefined,
      }));
    },
    staleTime: 5 * 60_000,
  });
}

export function useElementsInCollection(collectionId: string | undefined) {
  return useQuery({
    queryKey: collectionId
      ? notebookKeys.elementsInCollection(collectionId)
      : ['elements-disabled'],
    queryFn: async (): Promise<ElementData[]> => {
      if (!collectionId) throw new Error('collectionId required');

      const { data, error } = await supabase
        .from('notebook_elements')
        .select('*')
        .eq('collection_id', collectionId)
        .order('position', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ElementData[];
    },
    enabled: !!collectionId,
  });
}
