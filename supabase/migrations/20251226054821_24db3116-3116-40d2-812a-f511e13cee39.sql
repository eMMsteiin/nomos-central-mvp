-- Create task_blocks table for Notion-style unified blocks
CREATE TABLE public.task_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'subtask', 'image', 'text', 'divider'
  content JSONB NOT NULL DEFAULT '{}',
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_task_blocks_task_id ON public.task_blocks(task_id);
CREATE INDEX idx_task_blocks_position ON public.task_blocks(task_id, position);

-- Enable Row Level Security
ALTER TABLE public.task_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (matching existing permissive pattern)
CREATE POLICY "Anyone can view task blocks"
  ON public.task_blocks
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create task blocks"
  ON public.task_blocks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update task blocks"
  ON public.task_blocks
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete task blocks"
  ON public.task_blocks
  FOR DELETE
  USING (true);

-- Migrate existing subtasks to task_blocks
INSERT INTO public.task_blocks (task_id, type, content, position, created_at)
SELECT 
  task_id,
  'subtask',
  jsonb_build_object('text', text, 'completed', COALESCE(completed, false)),
  COALESCE(position, 0),
  COALESCE(created_at, now())
FROM public.subtasks;

-- Migrate existing attachments to task_blocks  
INSERT INTO public.task_blocks (task_id, type, content, position, created_at)
SELECT 
  task_id,
  'image',
  jsonb_build_object(
    'fileUrl', file_url, 
    'fileName', file_name, 
    'fileType', file_type
  ),
  COALESCE(position, 0) + 1000, -- offset to place after subtasks
  COALESCE(created_at, now())
FROM public.task_attachments;