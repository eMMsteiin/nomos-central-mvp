-- Create subtask_attachments table for storing files attached to individual subtasks
CREATE TABLE public.subtask_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.task_blocks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subtask_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access like task_attachments)
CREATE POLICY "Anyone can view subtask attachments" 
ON public.subtask_attachments FOR SELECT USING (true);

CREATE POLICY "Anyone can create subtask attachments" 
ON public.subtask_attachments FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update subtask attachments" 
ON public.subtask_attachments FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete subtask attachments" 
ON public.subtask_attachments FOR DELETE USING (true);

-- Create index for faster lookups by block_id
CREATE INDEX idx_subtask_attachments_block_id ON public.subtask_attachments(block_id);