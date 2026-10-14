import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente sem tipos para tabelas criadas pelas migrations 20261014* que ainda
 * não constam em src/integrations/supabase/types.ts (arquivo gerado).
 * Depois de aplicar as migrations e regenerar os tipos
 * (`npx supabase gen types typescript`), troque os usos por `supabase`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as unknown as SupabaseClient<any>;

/** A tabela ainda não existe no banco (migration não aplicada). */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|does not exist/i.test(error.message ?? "")
  );
}
