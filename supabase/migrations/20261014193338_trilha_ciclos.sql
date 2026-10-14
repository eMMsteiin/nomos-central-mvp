-- Passo 4 (menor ciclo da Trilha Propósito):
-- pergunta -> experimento -> tarefa -> reflexão. Cada linha é UM ciclo.
-- Privado por padrão: só o dono vê, edita e apaga (agência humana).
-- `task_id` é uma referência "solta" (sem FOREIGN KEY) de propósito: a tarefa
-- pode ainda estar na fila de envio offline quando o ciclo é salvo.
-- `clarity` (1-5) é a clareza autorreportada, base da métrica "ciclo
-- significativo concluído" do documento-mestre.
CREATE TABLE IF NOT EXISTS public.trilha_ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  experiment text,
  task_id uuid,
  status text NOT NULL DEFAULT 'pergunta'
    CHECK (status IN ('pergunta', 'experimento', 'executando', 'reflexao', 'concluido')),
  reflection text,
  clarity smallint CHECK (clarity BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_trilha_ciclos_user_created
  ON public.trilha_ciclos (user_id, created_at DESC);

ALTER TABLE public.trilha_ciclos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trilha cycles"
  ON public.trilha_ciclos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trilha cycles"
  ON public.trilha_ciclos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trilha cycles"
  ON public.trilha_ciclos FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trilha cycles"
  ON public.trilha_ciclos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Depende de public.set_updated_at() criada na migration de profiles.
CREATE TRIGGER trilha_ciclos_set_updated_at
  BEFORE UPDATE ON public.trilha_ciclos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
