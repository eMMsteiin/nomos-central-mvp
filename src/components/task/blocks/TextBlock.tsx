import { useState, useRef, useEffect, useCallback } from 'react';
import { TextContent } from '@/types/task';
import { GripVertical } from 'lucide-react';

interface TextBlockProps {
  content: TextContent;
  blockId: string;
  onTextChange: (text: string) => void;
  onDelete: () => void;
  onEnterOnEmpty?: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  autoFocus?: boolean;
  inlineMenu?: React.ReactNode;
}

export function TextBlock({
  content,
  onTextChange,
  onDelete,
  isDragging,
  dragHandleProps,
  autoFocus,
  inlineMenu,
}: TextBlockProps) {
  const [localText, setLocalText] = useState(content.text);
  const [cursorLineTop, setCursorLineTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalText(content.text);
  }, [content.text]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      updateCursorLine();
    }
  }, [autoFocus]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [localText, adjustHeight]);

  const updateCursorLine = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const pos = el.selectionStart;
    const textBefore = el.value.substring(0, pos);
    const lineNumber = textBefore.split('\n').length - 1;

    // Get line height from computed style
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 22;
    const paddingTop = parseFloat(computed.paddingTop) || 6;

    setCursorLineTop(paddingTop + lineNumber * lineHeight);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    adjustHeight();
    updateCursorLine();

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onTextChange(val);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace' && localText === '') {
      e.preventDefault();
      onDelete();
    }
  };

  const handleKeyUp = () => updateCursorLine();
  const handleClick = () => updateCursorLine();

  const handleBlur = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (localText !== content.text) {
      onTextChange(localText);
    }
  };

  return (
    <div
      className={`group relative flex items-start gap-1 transition-opacity ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Inline "+" menu that follows the cursor line */}
      {inlineMenu && (
        <div
          className="absolute transition-all duration-100 shrink-0 z-10"
          style={{ left: -28, top: cursorLineTop + 2 }}
        >
          {inlineMenu}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={localText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onBlur={handleBlur}
        placeholder="Escreva aqui..."
        rows={1}
        className="flex-1 bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 py-1.5 px-0 min-h-[28px]"
      />
    </div>
  );
}
