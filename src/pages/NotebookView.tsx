import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useNotebook } from '@/hooks/notebook/useNotebook';
import { useNotebookPages } from '@/hooks/notebook/useNotebookPages';
import { useCreateNotebookPage } from '@/hooks/notebook/mutations/usePageMutations';
import { NotebookCanvas } from '@/components/notebook/canvas/NotebookCanvas';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function NotebookView() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate = useNavigate();

  const { data: notebook, isLoading: loadingNotebook, error: notebookError } = useNotebook(notebookId);
  const { data: pages, isLoading: loadingPages } = useNotebookPages(notebookId);
  const createPage = useCreateNotebookPage();

  useEffect(() => {
    if (notebookError) {
      toast.error('Caderno não encontrado');
      navigate('/caderno');
    }
  }, [notebookError, navigate]);

  // Auto-create first page if notebook has none
  useEffect(() => {
    if (!notebook || !pages || createPage.isPending) return;
    if (pages.length === 0) {
      createPage.mutate({
        notebook_id: notebook.id,
        page_index: 0,
        paper_template: notebook.default_paper_template ?? 'blank',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebook?.id, pages?.length]);

  if (loadingNotebook || loadingPages) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!notebook) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white dark:bg-neutral-950">
        <p className="text-sm text-neutral-500">Caderno não encontrado.</p>
        <button
          onClick={() => navigate('/caderno')}
          className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar à biblioteca
        </button>
      </div>
    );
  }

  if (!pages || pages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-neutral-950">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const firstPage = pages[0];

  return <NotebookCanvas notebook={notebook} pageId={firstPage.id} />;
}
