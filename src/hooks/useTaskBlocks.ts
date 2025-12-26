import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskBlock, TaskBlockRow, blockRowToBlock, SubtaskContent, ImageContent } from '@/types/task';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export function useTaskBlocks(taskId: string | undefined) {
  const [blocks, setBlocks] = useState<TaskBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBlocks = useCallback(async () => {
    if (!taskId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_blocks')
        .select('*')
        .eq('task_id', taskId)
        .order('position', { ascending: true });

      if (error) throw error;
      
      setBlocks((data as TaskBlockRow[]).map(blockRowToBlock));
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast.error('Erro ao carregar blocos');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const getNextPosition = useCallback(() => {
    if (blocks.length === 0) return 0;
    return Math.max(...blocks.map(b => b.position)) + 1;
  }, [blocks]);

  const addSubtaskBlock = useCallback(async (text: string = '') => {
    if (!taskId) return null;

    const content: SubtaskContent = { text, completed: false };
    const position = getNextPosition();

    try {
      const { data, error } = await supabase
        .from('task_blocks')
        .insert([{
          task_id: taskId,
          type: 'subtask',
          content: JSON.parse(JSON.stringify(content)),
          position,
        }])
        .select()
        .single();

      if (error) throw error;
      
      const newBlock = blockRowToBlock(data as TaskBlockRow);
      setBlocks(prev => [...prev, newBlock]);
      return newBlock;
    } catch (error) {
      console.error('Error adding subtask block:', error);
      toast.error('Erro ao adicionar subtarefa');
      return null;
    }
  }, [taskId, getNextPosition]);

  const addImageBlock = useCallback(async (file: File) => {
    if (!taskId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}/${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      const content: ImageContent = {
        fileUrl: urlData.publicUrl,
        fileName: file.name,
        fileType: file.type,
      };

      const position = getNextPosition();

      const { data, error } = await supabase
        .from('task_blocks')
        .insert([{
          task_id: taskId,
          type: 'image',
          content: JSON.parse(JSON.stringify(content)),
          position,
        }])
        .select()
        .single();

      if (error) throw error;
      
      const newBlock = blockRowToBlock(data as TaskBlockRow);
      setBlocks(prev => [...prev, newBlock]);
      toast.success('Imagem adicionada');
      return newBlock;
    } catch (error) {
      console.error('Error adding image block:', error);
      toast.error('Erro ao adicionar imagem');
      return null;
    }
  }, [taskId, getNextPosition]);

  const updateBlockContent = useCallback(async (blockId: string, content: TaskBlock['content']) => {
    try {
      const { error } = await supabase
        .from('task_blocks')
        .update({ content: JSON.parse(JSON.stringify(content)) })
        .eq('id', blockId);

      if (error) throw error;
      
      setBlocks(prev => prev.map(b => 
        b.id === blockId ? { ...b, content } : b
      ));
    } catch (error) {
      console.error('Error updating block:', error);
      toast.error('Erro ao atualizar bloco');
    }
  }, []);

  const toggleSubtaskCompletion = useCallback(async (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'subtask') return;

    const content = block.content as SubtaskContent;
    const newContent: SubtaskContent = { ...content, completed: !content.completed };
    
    await updateBlockContent(blockId, newContent);
  }, [blocks, updateBlockContent]);

  const updateSubtaskText = useCallback(async (blockId: string, text: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block || block.type !== 'subtask') return;

    const content = block.content as SubtaskContent;
    const newContent: SubtaskContent = { ...content, text };
    
    await updateBlockContent(blockId, newContent);
  }, [blocks, updateBlockContent]);

  const deleteBlock = useCallback(async (blockId: string) => {
    try {
      const block = blocks.find(b => b.id === blockId);
      
      // If it's an image, also delete from storage
      if (block?.type === 'image') {
        const content = block.content as ImageContent;
        const url = content.fileUrl;
        const path = url.split('/task-attachments/')[1];
        if (path) {
          await supabase.storage.from('task-attachments').remove([path]);
        }
      }

      const { error } = await supabase
        .from('task_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;
      
      setBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch (error) {
      console.error('Error deleting block:', error);
      toast.error('Erro ao excluir bloco');
    }
  }, [blocks]);

  const reorderBlocks = useCallback(async (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, movedBlock);

    // Update positions
    const updatedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index,
    }));

    setBlocks(updatedBlocks);

    // Update in database
    try {
      const updates = updatedBlocks.map(block => 
        supabase
          .from('task_blocks')
          .update({ position: block.position })
          .eq('id', block.id)
      );
      
      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering blocks:', error);
      toast.error('Erro ao reordenar blocos');
      loadBlocks(); // Reload on error
    }
  }, [blocks, loadBlocks]);

  // Calculate subtask progress
  const subtaskBlocks = blocks.filter(b => b.type === 'subtask');
  const completedSubtasks = subtaskBlocks.filter(b => (b.content as SubtaskContent).completed).length;
  const subtaskProgress = subtaskBlocks.length > 0 
    ? Math.round((completedSubtasks / subtaskBlocks.length) * 100) 
    : 0;

  return {
    blocks,
    isLoading,
    addSubtaskBlock,
    addImageBlock,
    updateBlockContent,
    toggleSubtaskCompletion,
    updateSubtaskText,
    deleteBlock,
    reorderBlocks,
    subtaskProgress,
    totalSubtasks: subtaskBlocks.length,
    completedSubtasks,
  };
}
