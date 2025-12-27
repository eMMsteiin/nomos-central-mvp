import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDeviceId } from './useDeviceId';
import { 
  Task, 
  SubTask, 
  TaskAttachment, 
  TaskRow,
  SubTaskRow,
  TaskAttachmentRow,
  taskRowToTask,
  subtaskRowToSubtask,
  attachmentRowToAttachment
} from '@/types/task';

const STORAGE_KEY = 'nomos.tasks.today';

export function useTaskDetail(taskId: string) {
  const deviceId = useDeviceId();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);

  // Load task - check Supabase first, then localStorage
  const loadTask = useCallback(async () => {
    setIsLoading(true);

    try {
      // Try Supabase first (using maybeSingle to handle not found gracefully)
      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .maybeSingle();

      if (taskData && !error) {
        const loadedTask = taskRowToTask(taskData as TaskRow);
        setTask(loadedTask);
        setIsSynced(true);

        // Load subtasks and attachments
        const [subtasksRes, attachmentsRes] = await Promise.all([
          supabase
            .from('subtasks')
            .select('*')
            .eq('task_id', taskId)
            .order('position', { ascending: true }),
          supabase
            .from('task_attachments')
            .select('*')
            .eq('task_id', taskId)
            .order('position', { ascending: true }),
        ]);

        if (subtasksRes.data) {
          setSubtasks((subtasksRes.data as SubTaskRow[]).map(subtaskRowToSubtask));
        }
        if (attachmentsRes.data) {
          setAttachments((attachmentsRes.data as TaskAttachmentRow[]).map(attachmentRowToAttachment));
        }
      } else {
        // Not in Supabase - check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const tasks: Task[] = JSON.parse(stored);
          const localTask = tasks.find(t => t.id === taskId);
          
          if (localTask) {
            // Check if this task is already synced (has same ID in Supabase)
            // If not, try to sync it now
            const { data: existingTask } = await supabase
              .from('tasks')
              .select('id')
              .eq('id', localTask.id)
              .maybeSingle();
            
            if (existingTask) {
              // Task exists in Supabase, just load it
              setTask(localTask);
              setIsSynced(true);
            } else {
              // Task doesn't exist in Supabase - try to migrate
              const migratedTask = await migrateTaskToSupabase(localTask, deviceId);
              if (migratedTask) {
                setTask(migratedTask);
                setIsSynced(true);
              } else {
                setTask(localTask);
                setIsSynced(false);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading task:', err);
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tasks: Task[] = JSON.parse(stored);
        const localTask = tasks.find(t => t.id === taskId);
        if (localTask) {
          setTask(localTask);
          setIsSynced(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [taskId, deviceId]);

  useEffect(() => {
    if (taskId && deviceId) {
      loadTask();
    }
  }, [taskId, deviceId, loadTask]);

  // Migrate a localStorage task to Supabase (use same ID if UUID, otherwise generate new)
  const migrateTaskToSupabase = async (localTask: Task, deviceId: string): Promise<Task | null> => {
    try {
      // Check if localTask.id is already a valid UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(localTask.id);
      const taskIdToUse = isUUID ? localTask.id : crypto.randomUUID();

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          id: taskIdToUse,
          device_id: deviceId,
          text: localTask.text,
          description: localTask.description || null,
          due_date: localTask.dueDate ? new Date(localTask.dueDate).toISOString() : null,
          due_time: localTask.dueTime || null,
          priority: localTask.priority || 'baixa',
          category: localTask.category || 'entrada',
          source_type: localTask.sourceType || 'manual',
          completed: localTask.completed || false,
          type: localTask.type || 'task',
          start_time: localTask.startTime || null,
          end_time: localTask.endTime || null,
          duration_minutes: localTask.durationMinutes || null,
          focus_subject: localTask.focusSubject || null,
          timer_started_at: localTask.timerStartedAt || null,
          timer_paused_at: localTask.timerPausedAt || null,
          timer_remaining_seconds: localTask.timerRemainingSeconds || null,
          canva_design_url: localTask.canvaDesignUrl || null,
          canva_design_title: localTask.canvaDesignTitle || null,
          canva_time_spent: localTask.canvaTimeSpent || null,
          canva_last_opened: localTask.canvaLastOpened || null,
          is_canva_task: localTask.isCanvaTask || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Update localStorage: replace old ID with Supabase UUID
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tasks: Task[] = JSON.parse(stored);
        const updated = tasks.map(t => 
          t.id === localTask.id 
            ? { ...t, id: data.id, supabaseId: data.id } 
            : t
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }

      return taskRowToTask(data as TaskRow);
    } catch (err) {
      console.error('Failed to migrate task:', err);
      return null;
    }
  };

  // Update task
  const updateTask = async (updates: Partial<Task>) => {
    if (!task) return;

    const updatedTask = { ...task, ...updates };
    setTask(updatedTask);

    // Use task.id directly (now it's always UUID)
    if (isSynced) {
      await supabase
        .from('tasks')
        .update({
          text: updatedTask.text,
          description: updatedTask.description || null,
          due_date: updatedTask.dueDate ? new Date(updatedTask.dueDate).toISOString() : null,
          due_time: updatedTask.dueTime || null,
          priority: updatedTask.priority || 'baixa',
          completed: updatedTask.completed || false,
        })
        .eq('id', task.id);
    }

    // Also update localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const tasks: Task[] = JSON.parse(stored);
      const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('tasksUpdated'));
    }
  };

  // Subtask operations
  const addSubtask = async (text: string) => {
    if (!task || !isSynced) return;

    const maxPosition = subtasks.length > 0 
      ? Math.max(...subtasks.map(s => s.position)) + 1 
      : 0;

    const { data, error } = await supabase
      .from('subtasks')
      .insert({
        task_id: task.id,
        text,
        completed: false,
        position: maxPosition,
      })
      .select()
      .single();

    if (!error && data) {
      setSubtasks(prev => [...prev, subtaskRowToSubtask(data as SubTaskRow)]);
    }
  };

  const toggleSubtask = async (subtaskId: string) => {
    const subtask = subtasks.find(s => s.id === subtaskId);
    if (!subtask) return;

    const newCompleted = !subtask.completed;
    setSubtasks(prev => 
      prev.map(s => s.id === subtaskId ? { ...s, completed: newCompleted } : s)
    );

    await supabase
      .from('subtasks')
      .update({ completed: newCompleted })
      .eq('id', subtaskId);
  };

  const updateSubtaskText = async (subtaskId: string, text: string) => {
    setSubtasks(prev =>
      prev.map(s => s.id === subtaskId ? { ...s, text } : s)
    );

    await supabase
      .from('subtasks')
      .update({ text })
      .eq('id', subtaskId);
  };

  const deleteSubtask = async (subtaskId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
    await supabase.from('subtasks').delete().eq('id', subtaskId);
  };

  const reorderSubtasks = async (newOrder: SubTask[]) => {
    setSubtasks(newOrder);

    // Update positions in Supabase
    await Promise.all(
      newOrder.map((subtask, index) =>
        supabase
          .from('subtasks')
          .update({ position: index })
          .eq('id', subtask.id)
      )
    );
  };

  // Attachment operations
  const uploadAttachment = async (file: File) => {
    if (!task || !isSynced) return;

    const fileName = `${task.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(fileName);

    const maxPosition = attachments.length > 0
      ? Math.max(...attachments.map(a => a.position)) + 1
      : 0;

    const { data, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: task.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        position: maxPosition,
      })
      .select()
      .single();

    if (!error && data) {
      setAttachments(prev => [...prev, attachmentRowToAttachment(data as TaskAttachmentRow)]);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    setAttachments(prev => prev.filter(a => a.id !== attachmentId));

    // Delete from storage
    const path = attachment.fileUrl.split('/task-attachments/')[1];
    if (path) {
      await supabase.storage.from('task-attachments').remove([path]);
    }

    // Delete from database
    await supabase.from('task_attachments').delete().eq('id', attachmentId);
  };

  // Calculate subtask progress
  const subtaskProgress = subtasks.length > 0
    ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100)
    : 0;

  return {
    task,
    subtasks,
    attachments,
    isLoading,
    isSynced,
    subtaskProgress,
    updateTask,
    addSubtask,
    toggleSubtask,
    updateSubtaskText,
    deleteSubtask,
    reorderSubtasks,
    uploadAttachment,
    deleteAttachment,
    reload: loadTask,
  };
}
