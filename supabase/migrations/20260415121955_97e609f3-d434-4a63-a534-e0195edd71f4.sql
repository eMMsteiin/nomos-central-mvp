
-- 1. Add user_id to tasks table
ALTER TABLE public.tasks ADD COLUMN user_id uuid;

-- 2. Drop old permissive policies on tasks
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Anyone can delete tasks" ON public.tasks;

-- 3. Create user-scoped policies on tasks
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Drop old permissive policies on subtasks
DROP POLICY IF EXISTS "Anyone can view subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Anyone can create subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Anyone can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Anyone can delete subtasks" ON public.subtasks;

-- 5. Subtasks scoped via parent task ownership
CREATE POLICY "Users can view subtasks of their tasks"
  ON public.subtasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can create subtasks for their tasks"
  ON public.subtasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can update subtasks of their tasks"
  ON public.subtasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete subtasks of their tasks"
  ON public.subtasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND t.user_id = auth.uid()));

-- 6. Drop old permissive policies on task_blocks
DROP POLICY IF EXISTS "Anyone can view task blocks" ON public.task_blocks;
DROP POLICY IF EXISTS "Anyone can create task blocks" ON public.task_blocks;
DROP POLICY IF EXISTS "Anyone can update task blocks" ON public.task_blocks;
DROP POLICY IF EXISTS "Anyone can delete task blocks" ON public.task_blocks;

CREATE POLICY "Users can view their task blocks"
  ON public.task_blocks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_blocks.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can create their task blocks"
  ON public.task_blocks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_blocks.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can update their task blocks"
  ON public.task_blocks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_blocks.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete their task blocks"
  ON public.task_blocks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_blocks.task_id AND t.user_id = auth.uid()));

-- 7. Drop old permissive policies on task_attachments
DROP POLICY IF EXISTS "Anyone can view attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Anyone can create attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Anyone can update attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Anyone can delete attachments" ON public.task_attachments;

CREATE POLICY "Users can view their task attachments"
  ON public.task_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can create their task attachments"
  ON public.task_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can update their task attachments"
  ON public.task_attachments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND t.user_id = auth.uid()));

CREATE POLICY "Users can delete their task attachments"
  ON public.task_attachments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_attachments.task_id AND t.user_id = auth.uid()));

-- 8. Drop old permissive policies on subtask_attachments
DROP POLICY IF EXISTS "Anyone can view subtask attachments" ON public.subtask_attachments;
DROP POLICY IF EXISTS "Anyone can create subtask attachments" ON public.subtask_attachments;
DROP POLICY IF EXISTS "Anyone can update subtask attachments" ON public.subtask_attachments;
DROP POLICY IF EXISTS "Anyone can delete subtask attachments" ON public.subtask_attachments;

CREATE POLICY "Users can view their subtask attachments"
  ON public.subtask_attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_blocks tb
    JOIN public.tasks t ON t.id = tb.task_id
    WHERE tb.id = subtask_attachments.block_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Users can create their subtask attachments"
  ON public.subtask_attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_blocks tb
    JOIN public.tasks t ON t.id = tb.task_id
    WHERE tb.id = subtask_attachments.block_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their subtask attachments"
  ON public.subtask_attachments FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_blocks tb
    JOIN public.tasks t ON t.id = tb.task_id
    WHERE tb.id = subtask_attachments.block_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their subtask attachments"
  ON public.subtask_attachments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_blocks tb
    JOIN public.tasks t ON t.id = tb.task_id
    WHERE tb.id = subtask_attachments.block_id AND t.user_id = auth.uid()
  ));

-- 9. Fix task-attachments storage bucket: make private
UPDATE storage.buckets SET public = false WHERE id = 'task-attachments';

-- 10. Drop old permissive storage policies for task-attachments
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete task attachments" ON storage.objects;

-- 11. Create scoped storage policies for task-attachments
CREATE POLICY "Authenticated users can view task attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can update task attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can delete task attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments');

-- 12. Add missing UPDATE policy for deck-sources storage bucket
CREATE POLICY "Users can update their deck sources"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'deck-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 13. Fix deck-sources SELECT/DELETE policies to require authentication
DROP POLICY IF EXISTS "Users can view their deck sources" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their deck sources" ON storage.objects;

CREATE POLICY "Users can view their deck sources"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deck-sources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their deck sources"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deck-sources' AND auth.uid()::text = (storage.foldername(name))[1]);
