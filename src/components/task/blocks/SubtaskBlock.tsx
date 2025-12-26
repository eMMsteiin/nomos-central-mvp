import { useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, X, Paperclip, Download, Loader2, FileText, Image as ImageIcon, File, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubtaskContent } from '@/types/task';
import { useSubtaskAttachments } from '@/hooks/useSubtaskAttachments';
import { AnimatePresence, motion } from 'framer-motion';

interface SubtaskBlockProps {
  content: SubtaskContent;
  blockId: string;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function getFileIcon(fileType?: string, fileName?: string) {
  if (!fileType && !fileName) return <File className="h-4 w-4 text-muted-foreground" />;
  
  const type = fileType?.toLowerCase() || '';
  const name = fileName?.toLowerCase() || '';
  
  // PDF
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  
  // Word documents
  if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) {
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  
  // Excel/Spreadsheets
  if (type.includes('sheet') || type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return <FileText className="h-4 w-4 text-green-500" />;
  }
  
  // Images
  if (type.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4 text-purple-500" />;
  }
  
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubtaskBlock({
  content,
  blockId,
  onToggle,
  onTextChange,
  onDelete,
  isDragging,
  dragHandleProps,
}: SubtaskBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(content.text);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attachments,
    isLoading: isLoadingAttachments,
    isUploading,
    uploadAttachment,
    deleteAttachment,
  } = useSubtaskAttachments(blockId);

  useEffect(() => {
    setText(content.text);
  }, [content.text]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== content.text) {
      onTextChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setText(content.text);
      setIsEditing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAttachment(file);
      // Expand to show the new attachment
      setIsExpanded(true);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasAttachments = attachments.length > 0;

  return (
    <div
      className={cn(
        'group relative rounded-md transition-colors',
        'hover:bg-muted/50',
        isDragging && 'opacity-50 bg-muted',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 py-2 px-2">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className={cn(
            'cursor-grab active:cursor-grabbing text-muted-foreground transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0',
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Checkbox */}
        <Checkbox
          checked={content.completed}
          onCheckedChange={onToggle}
          className="h-5 w-5"
        />

        {/* Text */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={cn(
              'flex-1 text-sm cursor-text',
              content.completed && 'line-through text-muted-foreground',
            )}
          >
            {content.text || <span className="text-muted-foreground italic">Subtarefa sem título</span>}
          </span>
        )}

        {/* Attachment count badge */}
        {hasAttachments && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Paperclip className="h-3 w-3" />
            <span>{attachments.length}</span>
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all',
            isHovered || hasAttachments ? 'opacity-100' : 'opacity-0',
          )}
          title="Anexar arquivo"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Delete button */}
        <button
          onClick={onDelete}
          className={cn(
            'p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all',
            isHovered ? 'opacity-100' : 'opacity-0',
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Attachments area (expandable) */}
      <AnimatePresence>
        {isExpanded && hasAttachments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-9 mr-2 mb-2 space-y-1">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group/attachment"
                >
                  {getFileIcon(attachment.fileType, attachment.fileName)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{attachment.fileName || 'Arquivo'}</p>
                    {attachment.fileSize && (
                      <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                    )}
                  </div>
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={attachment.fileName}
                    className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Baixar"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => deleteAttachment(attachment.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover/attachment:opacity-100"
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
