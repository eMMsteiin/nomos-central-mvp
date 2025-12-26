-- Tabela principal de tarefas (migração do localStorage)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  text TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  due_time TEXT,
  priority TEXT DEFAULT 'baixa',
  category TEXT DEFAULT 'entrada',
  source_type TEXT DEFAULT 'manual',
  completed BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'task',
  -- Campos para study blocks
  start_time TEXT,
  end_time TEXT,
  duration_minutes INTEGER,
  focus_subject TEXT,
  timer_started_at TEXT,
  timer_paused_at TEXT,
  timer_remaining_seconds INTEGER,
  -- Campos Canva
  canva_design_url TEXT,
  canva_design_title TEXT,
  canva_time_spent INTEGER,
  canva_last_opened TEXT,
  is_canva_task BOOLEAN DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por device_id
CREATE INDEX idx_tasks_device_id ON public.tasks(device_id);
CREATE INDEX idx_tasks_category ON public.tasks(category);

-- Tabela de subtarefas
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);

-- Tabela de anexos
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);

-- RLS para tasks (permissivo por device_id, sem auth)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks"
  ON public.tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tasks"
  ON public.tasks FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete tasks"
  ON public.tasks FOR DELETE
  USING (true);

-- RLS para subtasks
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subtasks"
  ON public.subtasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create subtasks"
  ON public.subtasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update subtasks"
  ON public.subtasks FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete subtasks"
  ON public.subtasks FOR DELETE
  USING (true);

-- RLS para attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attachments"
  ON public.task_attachments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create attachments"
  ON public.task_attachments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update attachments"
  ON public.task_attachments FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete attachments"
  ON public.task_attachments FOR DELETE
  USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tasks_updated_at();

-- Bucket de storage para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Políticas de storage
CREATE POLICY "Anyone can view task attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can update task attachments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can delete task attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments');