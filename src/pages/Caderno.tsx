import { NotebookLibrary } from '@/components/notebook/library/NotebookLibrary';
import { useNotebookRealtime } from '@/hooks/notebook/realtime/useNotebookRealtime';

export default function Caderno() {
  // Ativa realtime enquanto o usuário está na aba Caderno
  useNotebookRealtime();
  return <NotebookLibrary />;
}
