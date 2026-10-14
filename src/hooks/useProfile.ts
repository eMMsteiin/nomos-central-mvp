import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { db, isMissingTable } from "@/lib/supabaseUntyped";

export interface Profile {
  displayName: string;
  institution: string;
  course: string;
}

const EMPTY: Profile = { displayName: "", institution: "", course: "" };

/** Perfil opcional e privado do usuário (tabela public.profiles). */
export function useProfile() {
  const { userId } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ["profile", userId];

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async (): Promise<{ profile: Profile; tableMissing: boolean }> => {
      const { data, error } = await db
        .from("profiles")
        .select("display_name, institution, course")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        if (isMissingTable(error)) return { profile: EMPTY, tableMissing: true };
        throw error;
      }
      return {
        tableMissing: false,
        profile: {
          displayName: data?.display_name ?? "",
          institution: data?.institution ?? "",
          course: data?.course ?? "",
        },
      };
    },
  });

  const save = useMutation({
    mutationFn: async (profile: Profile) => {
      const { error } = await db.from("profiles").upsert(
        {
          id: userId,
          display_name: profile.displayName.trim() || null,
          institution: profile.institution.trim() || null,
          course: profile.course.trim() || null,
        },
        { onConflict: "id" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    profile: query.data?.profile ?? EMPTY,
    tableMissing: query.data?.tableMissing ?? false,
    isLoading: query.isLoading,
    save,
  };
}
