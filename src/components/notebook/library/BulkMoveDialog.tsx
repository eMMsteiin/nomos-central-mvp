import { useState, useEffect } from 'react';
import { Folder, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNotebookFolders } from '@/hooks/notebook/useNotebookFolders';

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  onConfirm: (folderId: string | null, folderName: string) => Promise<void> | void;
  isPending?: boolean;
}

export function BulkMoveDialog({ open, onOpenChange, count, onConfirm, isPending }: BulkMoveDialogProps) {
  const { data: folders } = useNotebookFolders(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const handleMove = async () => {
    const name = selected === null ? 'Raiz' : (folders?.find((f) => f.id === selected)?.name ?? 'pasta');
    await onConfirm(selected, name);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Mover {count} {count === 1 ? 'caderno' : 'cadernos'} para...
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2 max-h-72 overflow-y-auto">
          <label className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition">
            <input
              type="radio"
              checked={selected === null}
              onChange={() => setSelected(null)}
              className="accent-neutral-900 dark:accent-neutral-100"
            />
            <span className="text-sm">Sem pasta (raiz)</span>
          </label>
          {(folders ?? []).map((f) => (
            <label
              key={f.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition"
            >
              <input
                type="radio"
                checked={selected === f.id}
                onChange={() => setSelected(f.id)}
                className="accent-neutral-900 dark:accent-neutral-100"
              />
              <Folder className="w-4 h-4" style={{ color: f.color ?? '#737373' }} />
              <span className="text-sm flex-1 truncate">{f.name}</span>
              <span className="text-xs text-neutral-500">{f.notebook_count ?? 0}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleMove}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Mover
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
