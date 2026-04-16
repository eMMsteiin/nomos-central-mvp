import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreateNotebook } from '@/hooks/notebook/mutations/useNotebookMutations';
import { useNotebookFolders } from '@/hooks/notebook/useNotebookFolders';
import { usePaperTemplates } from '@/hooks/notebook/useNotebookTemplates';
import { CoverPicker } from './CoverPicker';
import { PaperTemplatePicker } from './PaperTemplatePicker';

interface NewNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFolderId?: string | null;
}

export function NewNotebookDialog({
  open,
  onOpenChange,
  defaultFolderId = null,
}: NewNotebookDialogProps) {
  const [title, setTitle] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [coverType, setCoverType] = useState<'default' | 'custom'>('default');
  const [coverData, setCoverData] = useState<string | null>('cover-black');
  const [paperTemplate, setPaperTemplate] = useState('blank');
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);

  const { data: folders } = useNotebookFolders(null);
  const { data: paperTemplates } = usePaperTemplates('paper');
  const createNotebook = useCreateNotebook();

  useEffect(() => {
    if (open) {
      setTitle('');
      setDiscipline('');
      setCoverType('default');
      setCoverData('cover-black');
      setPaperTemplate('blank');
      setFolderId(defaultFolderId);
    }
  }, [open, defaultFolderId]);

  const handleCustomUpload = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${user.id}/covers/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('notebook-assets')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from('notebook-assets').getPublicUrl(path);
      setCoverType('custom');
      setCoverData(pub.publicUrl);
      toast.success('Capa enviada');
    } catch (err) {
      console.error(err);
      toast.error('Falha ao enviar capa');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createNotebook.mutateAsync({
        title: title.trim(),
        discipline: discipline.trim() || undefined,
        folder_id: folderId,
        cover_type: coverType,
        cover_data: coverData,
        default_paper_template: paperTemplate,
        first_page_template: paperTemplate,
        create_first_page: true,
      });
      toast.success('Caderno criado');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar caderno');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Novo Caderno</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Título</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meu caderno"
              className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Disciplina <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <input
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              placeholder="Ex: Filosofia do Direito"
              className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Capa</label>
            <CoverPicker
              selectedCoverType={coverType}
              selectedCoverData={coverData}
              onSelect={(type, data) => {
                setCoverType(type as 'default' | 'custom');
                setCoverData(data);
              }}
              onCustomUpload={handleCustomUpload}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Papel</label>
            {paperTemplates && paperTemplates.length > 0 ? (
              <PaperTemplatePicker
                templates={paperTemplates}
                selectedTemplateData={paperTemplate}
                onSelect={setPaperTemplate}
              />
            ) : (
              <div className="text-xs text-neutral-500 py-4 text-center">Carregando templates...</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Pasta <span className="text-neutral-400 font-normal">(opcional)</span>
            </label>
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400"
            >
              <option value="">Sem pasta (raiz)</option>
              {(folders ?? []).map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
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
            disabled={!title.trim() || createNotebook.isPending}
            className="px-4 py-2 text-sm rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
          >
            {createNotebook.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Criar caderno
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
