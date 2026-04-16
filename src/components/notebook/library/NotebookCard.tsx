import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, MoreHorizontal, Trash2, Edit3, FileText } from 'lucide-react';
import {
  useToggleNotebookFavorite,
  useUpdateNotebook,
  useDeleteNotebook,
} from '@/hooks/notebook/mutations/useNotebookMutations';
import { NotebookCover } from './NotebookCover';
import type { NotebookRow } from '@/hooks/notebook/useNotebooks';

interface NotebookCardProps {
  notebook: NotebookRow;
  viewMode: 'grid' | 'list';
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'Agora mesmo';
  if (diffMin < 60) return `${diffMin} min atrás`;
  if (diffHrs < 24) return `${diffHrs}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function NotebookCard({ notebook, viewMode }: NotebookCardProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(notebook.title);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleFavorite = useToggleNotebookFavorite();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();

  // Fechar menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleOpen = () => {
    if (isRenaming) return;
    navigate(`/caderno/${notebook.id}`);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite.mutate({ id: notebook.id, is_favorite: !notebook.is_favorite });
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && renameValue.trim() !== notebook.title) {
      updateNotebook.mutate({ id: notebook.id, patch: { title: renameValue.trim() } });
    }
    setIsRenaming(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (confirm(`Excluir "${notebook.title}"? Esta ação não pode ser desfeita.`)) {
      deleteNotebook.mutate(notebook.id);
    }
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setIsRenaming(true);
    setRenameValue(notebook.title);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const timeAgo = getTimeAgo(notebook.updated_at);
  const subtitle = notebook.discipline || notebook.subject || timeAgo;

  // ─── MODO GRID ───
  if (viewMode === 'grid') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        onClick={handleOpen}
        className="group cursor-pointer"
      >
        <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 hover:shadow-sm transition-shadow">
          <NotebookCover
            coverType={notebook.cover_type}
            coverData={notebook.cover_data}
            title={notebook.title}
          />

          <button
            onClick={handleFavorite}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black transition opacity-0 group-hover:opacity-100 data-[active=true]:opacity-100"
            data-active={notebook.is_favorite}
            title={notebook.is_favorite ? 'Desfavoritar' : 'Favoritar'}
            aria-label={notebook.is_favorite ? 'Desfavoritar' : 'Favoritar'}
          >
            <Star
              className={`w-4 h-4 ${
                notebook.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-neutral-500'
              }`}
            />
          </button>

          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-1.5 rounded-full bg-white/80 dark:bg-black/60 hover:bg-white dark:hover:bg-black transition"
              aria-label="Mais opções"
            >
              <MoreHorizontal className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
            </button>

            {menuOpen && (
              <div
                className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleStartRename}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-left"
                >
                  <Edit3 className="w-4 h-4" /> Renomear
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    toggleFavorite.mutate({ id: notebook.id, is_favorite: !notebook.is_favorite });
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-left"
                >
                  <Star className="w-4 h-4" /> {notebook.is_favorite ? 'Desfavoritar' : 'Favoritar'}
                </button>
                <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition text-left"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            )}
          </div>

          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/60 text-xs text-neutral-700 dark:text-neutral-300">
            <FileText className="w-3 h-3" />
            {notebook.page_count ?? 0}
          </div>
        </div>

        <div className="mt-2 px-1">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="w-full text-sm font-semibold bg-transparent border-b border-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="text-sm font-semibold truncate">{notebook.title}</h3>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {subtitle}
          </p>
        </div>
      </motion.div>
    );
  }

  // ─── MODO LIST ───
  return (
    <div
      onClick={handleOpen}
      className="group flex items-center gap-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition cursor-pointer"
    >
      <div className="w-12 h-16 rounded overflow-hidden border border-neutral-200 dark:border-neutral-800 flex-shrink-0">
        <NotebookCover
          coverType={notebook.cover_type}
          coverData={notebook.cover_data}
          title={notebook.title}
          mini
        />
      </div>

      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            className="text-sm font-semibold bg-transparent border-b border-neutral-400 focus:outline-none w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="text-sm font-semibold truncate">{notebook.title}</h3>
        )}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
          {notebook.discipline ? `${notebook.discipline} · ` : ''}
          {notebook.page_count ?? 0} páginas · {timeAgo}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleFavorite}
          className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
          aria-label={notebook.is_favorite ? 'Desfavoritar' : 'Favoritar'}
        >
          <Star
            className={`w-4 h-4 ${
              notebook.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-neutral-400'
            }`}
          />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md shadow-lg py-1 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleStartRename}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition text-left"
              >
                <Edit3 className="w-4 h-4" /> Renomear
              </button>
              <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition text-left"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
