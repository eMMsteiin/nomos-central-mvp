import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskBlock, TaskBlockRow, blockRowToBlock, SubtaskContent, ImageContent, NotebookContent } from '@/types/task';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { Notebook } from '@/types/notebook';
import { renderPageToCanvas } from '@/utils/notebookExport';

// Validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Sanitize filename for Supabase Storage (remove accents and special chars)
const sanitizeFileName = (name: string): string => {
  return name
    .normalize('NFD')                    // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')     // Remove accent marks
    .replace(/[^a-zA-Z0-9-_]/g, '_')     // Replace invalid chars with _
    .replace(/_+/g, '_')                 // Remove duplicate underscores
    .replace(/^_|_$/g, '');              // Remove _ at start/end
};

// Convert data URL to Blob
const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export function useTaskBlocks(taskId: string | undefined) {
  const [blocks, setBlocks] = useState<TaskBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPages, setIsProcessingPages] = useState(false);

  const loadBlocks = useCallback(async () => {
    if (!taskId || !isValidUUID(taskId)) {
      setIsLoading(false);
      return;
    }
    
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
    if (!taskId || !isValidUUID(taskId)) return null;

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
    if (!taskId || !isValidUUID(taskId)) return null;

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

  const addNotebookBlock = useCallback(async (notebook: Notebook) => {
    if (!taskId || !isValidUUID(taskId)) return null;

    const content: NotebookContent = {
      notebookId: notebook.id,
      notebookTitle: notebook.title,
      notebookColor: notebook.color,
      notebookDiscipline: notebook.discipline,
    };

    const position = getNextPosition();

    try {
      const { data, error } = await supabase
        .from('task_blocks')
        .insert([{
          task_id: taskId,
          type: 'notebook',
          content: JSON.parse(JSON.stringify(content)),
          position,
        }])
        .select()
        .single();

      if (error) throw error;
      
      const newBlock = blockRowToBlock(data as TaskBlockRow);
      setBlocks(prev => [...prev, newBlock]);
      toast.success('Caderno vinculado');
      return newBlock;
    } catch (error) {
      console.error('Error adding notebook block:', error);
      toast.error('Erro ao vincular caderno');
      return null;
    }
  }, [taskId, getNextPosition]);

  const addNotebookPagesAsImages = useCallback(async (notebook: Notebook, pageIndexes: number[]) => {
    if (!taskId || !isValidUUID(taskId)) return;
    if (pageIndexes.length === 0) return;

    setIsProcessingPages(true);

    try {
      const newBlocks: TaskBlock[] = [];
      let currentPosition = getNextPosition();

      for (let i = 0; i < pageIndexes.length; i++) {
        const pageIndex = pageIndexes[i];
        const page = notebook.pages[pageIndex];
        
        if (!page) continue;

        // Render page to canvas with higher DPR for quality
        const dataUrl = await renderPageToCanvas(page, 1.5);
        
        if (!dataUrl) continue;

        // Convert to blob and upload
        const blob = dataUrlToBlob(dataUrl);
        const sanitizedTitle = sanitizeFileName(notebook.title);
        const fileName = `${taskId}/${sanitizedTitle}_pagina_${pageIndex + 1}_${crypto.randomUUID()}.png`;

        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(fileName, blob, {
            contentType: 'image/png',
          });

        if (uploadError) {
          console.error(`Error uploading page ${pageIndex + 1}:`, uploadError);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(fileName);

        const content: ImageContent = {
          fileUrl: urlData.publicUrl,
          fileName: `${notebook.title} - Página ${pageIndex + 1}.png`,
          fileType: 'image/png',
        };

        const { data, error } = await supabase
          .from('task_blocks')
          .insert([{
            task_id: taskId,
            type: 'image',
            content: JSON.parse(JSON.stringify(content)),
            position: currentPosition,
          }])
          .select()
          .single();

        if (error) {
          console.error(`Error creating block for page ${pageIndex + 1}:`, error);
          continue;
        }

        const newBlock = blockRowToBlock(data as TaskBlockRow);
        newBlocks.push(newBlock);
        currentPosition++;
      }

      setBlocks(prev => [...prev, ...newBlocks]);
      
      if (newBlocks.length > 0) {
        toast.success(`${newBlocks.length} página${newBlocks.length !== 1 ? 's' : ''} anexada${newBlocks.length !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error adding notebook pages as images:', error);
      toast.error('Erro ao anexar páginas');
    } finally {
      setIsProcessingPages(false);
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
    isProcessingPages,
    addSubtaskBlock,
    addImageBlock,
    addNotebookBlock,
    addNotebookPagesAsImages,
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
