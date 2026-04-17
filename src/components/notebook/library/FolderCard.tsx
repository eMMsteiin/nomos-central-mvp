import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import {
  Folder, BookOpen, Scale, Lightbulb, FlaskConical, GraduationCap,
  Ruler, Globe, Calculator, Code, MoreHorizontal, Edit3, Palette, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateFolder, useDeleteFolder } from '@/hooks/notebook/mutations/useFolderMutations';
import type { NotebookFolder } from '@/hooks/notebook/useNotebookFolders';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder, BookOpen, Scale, Lightbulb, FlaskConical, GraduationCap,
  Ruler, Globe, Calculator, Code,
};

export const FOLDER_COLORS = [
  '#737373', '#525252', '#A3A3A3', '#404040', '#7F7F7F',
  '#8B7355', '#6B7B8F', '#7B8F6B', '#8F6B7B', '#7B6B8F',
];

interface FolderCardProps {
  folder: NotebookFolder;
  onClick: (folderId: string) => void;
}

export function FolderCard({ folder, onClick }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}` });

  useEffect(() => {
    if (!menuOpen && !colorOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, colorOpen]);

  const Icon = ICON_MAP[folder.icon ?? 'Folder'] ?? Folder;
  const color = folder.color ?? '#737373';

  const handleClick = () => {
    if (isRenaming || menuOpen || colorOpen) return;
    onClick(folder.id);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== folder.name) {
      updateFolder.mutate({ id: folder.id, patch: { name: renameValue.trim() } });
    }
    setIsRenaming(false);
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setIsRenaming(true);
    setRenameValue(folder.name);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    const count = folder.notebook_count ?? 0;
    if (count > 0) {
      const choice = confirm(
        `A pasta "${folder.name}" contém ${count} caderno(s).\n\nOK = Mover cadernos para a raiz e excluir pasta\nCancelar = Não fazer nada`
      );
      if (!choice) return;
      deleteFolder.mutate(
        { folderId: folder.id, notebookAction: 'move_to_root' },
        { onSuccess: () => toast.success('Pasta excluída') }
      );
    } else {
      if (!confirm(`Excluir pasta "${folder.name}"?`)) return;
      deleteFolder.mutate(
        { folderId: folder.id, notebookAction: 'move_to_root' },
        { onSuccess: () => toast.success('Pasta excluída') }
      );
    }
  };

  const handleColorChange = (newColor: string) => {
    updateFolder.mutate({ id: folder.id, patch: { color: newColor } });
    setColorOpen(false);
    setMenuOpen(false);
  };

  return (
    <motion.div
      ref={setNodeRef}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`group relative w-28 h-32 flex-shrink-0 rounded-lg overflow-hidden border bg-white dark:bg-neutral-900 hover:shadow-sm transition-all cursor-pointer ${
        isOver
          ? 'ring-2 ring-neutral-900 dark:ring-neutral-100 border-transparent bg-neutral-100 dark:bg-neutral-800 scale-105'
          : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />

      <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 transition" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setColorOpen(false); }}
          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
          aria-label="Opções da pasta"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-neutral-500" />
        </button>
        {menuOpen && !colorOpen && (
          <div
            className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleStartRename} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left">
              <Edit3 className="w-3.5 h-3.5" /> Renomear
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setColorOpen(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
            >
              <Palette className="w-3.5 h-3.5" /> Mudar cor
            </button>
            <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 text-left">
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </div>
        )}
        {colorOpen && (
          <div
            className="absolute top-full right-0 mt-1 p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg z-30 grid grid-cols-5 gap-1.5 w-44"
            onClick={(e) => e.stopPropagation()}
          >
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-neutral-900 dark:border-neutral-100' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="h-full flex flex-col items-center justify-center px-2 pt-3">
        <Icon className="w-6 h-6 mb-1.5" style={{ color }} />
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs text-center bg-transparent border-b border-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
          />
        ) : (
          <p className="text-xs font-medium text-center text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-tight">
            {folder.name}
          </p>
        )}
        <span className="absolute bottom-1.5 right-2 text-[10px] text-neutral-500">
          {folder.notebook_count ?? 0}
        </span>
      </div>
    </motion.div>
  );
}
