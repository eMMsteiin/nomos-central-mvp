import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidators } from '../utils/invalidation';

export function useCreateElementCollection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, icon }: { name: string; icon?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notebook_element_collections')
        .insert({ user_id: user.id, name, icon: icon ?? 'Sticker', is_builtin: false })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidators.allCollections(qc);
    },
  });
}

export function useDeleteElementCollection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from('notebook_element_collections')
        .delete()
        .eq('id', collectionId)
        .eq('is_builtin', false);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidators.allCollections(qc);
    },
  });
}

interface AddElementInput {
  collection_id: string;
  name?: string;
  thumbnail_url?: string | null;
  element_data: unknown;
}

export function useAddElementToCollection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddElementInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notebook_elements')
        .insert({
          user_id: user.id,
          collection_id: input.collection_id,
          name: input.name ?? null,
          thumbnail_url: input.thumbnail_url ?? null,
          element_data: input.element_data,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { collection_id }) => {
      invalidators.elementsInCollection(qc, collection_id);
      invalidators.allCollections(qc);
    },
  });
}

export function useDeleteElement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, collection_id }: { id: string; collection_id: string }) => {
      const { error } = await supabase.from('notebook_elements').delete().eq('id', id);
      if (error) throw error;
      return { collection_id };
    },
    onSuccess: (_data, { collection_id }) => {
      invalidators.elementsInCollection(qc, collection_id);
      invalidators.allCollections(qc);
    },
  });
}
