import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SubtaskAttachment {
  id: string;
  blockId: string;
  fileUrl: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
}

interface SubtaskAttachmentRow {
  id: string;
  block_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

function rowToAttachment(row: SubtaskAttachmentRow): SubtaskAttachment {
  return {
    id: row.id,
    blockId: row.block_id,
    fileUrl: row.file_url,
    fileName: row.file_name ?? undefined,
    fileType: row.file_type ?? undefined,
    fileSize: row.file_size ?? undefined,
    createdAt: row.created_at,
  };
}

export function useSubtaskAttachments(blockId: string) {
  const [attachments, setAttachments] = useState<SubtaskAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!blockId) return;
    
    try {
      const { data, error } = await supabase
        .from('subtask_attachments')
        .select('*')
        .eq('block_id', blockId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAttachments((data || []).map(rowToAttachment));
    } catch (error) {
      console.error('Error loading subtask attachments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [blockId]);

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const uploadAttachment = useCallback(async (file: File) => {
    if (!blockId) return;
    
    setIsUploading(true);
    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${blockId}/${Date.now()}.${fileExt}`;

      // Upload to storage (using existing task-attachments bucket)
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      // Create database record
      const { data, error: insertError } = await supabase
        .from('subtask_attachments')
        .insert({
          block_id: blockId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setAttachments(prev => [...prev, rowToAttachment(data)]);
      
      toast({
        title: 'Arquivo anexado',
        description: file.name,
      });
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast({
        title: 'Erro ao anexar arquivo',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [blockId]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) return;

    try {
      // Extract file path from URL for storage deletion
      const url = new URL(attachment.fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('task-attachments');
      if (bucketIndex !== -1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        await supabase.storage.from('task-attachments').remove([filePath]);
      }

      // Delete database record
      const { error } = await supabase
        .from('subtask_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      
      toast({
        title: 'Anexo removido',
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'Erro ao remover anexo',
        variant: 'destructive',
      });
    }
  }, [attachments]);

  return {
    attachments,
    isLoading,
    isUploading,
    uploadAttachment,
    deleteAttachment,
    reloadAttachments: loadAttachments,
  };
}
