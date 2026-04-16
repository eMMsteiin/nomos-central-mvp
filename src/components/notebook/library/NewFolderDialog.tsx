import { useState } from 'react';
import {
  Folder, BookOpen, Scale, Lightbulb, FlaskConical, GraduationCap,
  Ruler, Globe, Calculator, Code, Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateFolder } from '@/hooks/notebook/mutations/useFolderMutations';
import { FOLDER_COLORS } from './FolderCard';

const ICONS = [
  { id: 'Folder', Icon: Folder },
  { id: 'BookOpen', Icon: BookOpen },
  { id: 'Scale', Icon: Scale },
  { id: 'Lightbulb', Icon: Lightbulb },
  { id: 'FlaskConical', Icon: FlaskConical },
  { id: 'GraduationCap', Icon: GraduationCap },
  { id: 'Ruler', Icon: Ruler },
  { id: 'Globe', Icon: Globe },
  { id: 'Calculator', Icon: Calculator },
  { id: 'Code', Icon: Code },
];

interface NewFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewFolderDialog({ open, onOpenChange }: NewFolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [icon, setIcon] = useState('Folder');
  const createFolder = useCreateFolder();

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createFolder.mutateAsync({ name: name.trim(), color, icon });
    setName('');
    setColor(FOLDER_COLORS[0]);
    setIcon('Folder');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Nova Pasta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) handleCreate(); }}
              placeholder="Ex: Direito Civil"
              className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Cor</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition ${
                    color === c ? 'border-neutral-900 dark:border-neutral-100 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Ícone</label>
            <div className="grid grid-cols-5 gap-1.5">
              {ICONS.map(({ id, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIcon(id)}
                  className={`p-2 rounded-md flex items-center justify-center transition ${
                    icon === id
                      ? 'bg-neutral-200 dark:bg-neutral-700'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                  aria-label={id}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || createFolder.isPending}
            className="px-4 py-2 text-sm rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {createFolder.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar pasta
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
