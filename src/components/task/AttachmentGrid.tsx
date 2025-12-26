import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ImageIcon, FileIcon, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskAttachment } from '@/types/task';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface AttachmentGridProps {
  attachments: TaskAttachment[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  isUploading?: boolean;
}

export function AttachmentGrid({
  attachments,
  onUpload,
  onDelete,
  isUploading = false,
}: AttachmentGridProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<TaskAttachment | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isImage = (fileType?: string) => {
    return fileType?.startsWith('image/');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-foreground">Anexos</h3>
          {attachments.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {attachments.length} {attachments.length === 1 ? 'arquivo' : 'arquivos'}
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Plus className="h-4 w-4" />
          {isUploading ? 'Enviando...' : 'Adicionar'}
        </Button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {attachments.map((attachment) => (
              <motion.div
                key={attachment.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors"
              >
                {isImage(attachment.fileType) ? (
                  <>
                    <img
                      src={attachment.fileUrl}
                      alt={attachment.fileName || 'Anexo'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setPreviewImage(attachment)}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                    <FileIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground line-clamp-2">
                      {attachment.fileName || 'Arquivo'}
                    </span>
                  </div>
                )}
                
                {/* Delete button */}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDelete(attachment.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Nenhum anexo ainda.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar imagem ou arquivo
          </Button>
        </div>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {previewImage?.fileName || 'Visualização da imagem'}
          </DialogTitle>
          {previewImage && (
            <img
              src={previewImage.fileUrl}
              alt={previewImage.fileName || 'Anexo'}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
