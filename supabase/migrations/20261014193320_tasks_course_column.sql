-- Passo 3 (tarefas no Supabase como fonte de verdade):
-- a interface exibe o "curso/local" das tarefas importadas (ICS), mas a tabela
-- não tinha onde guardar esse campo. Aditiva e segura: coluna opcional.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS course text;
