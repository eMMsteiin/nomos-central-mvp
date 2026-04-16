import { useNotebooks } from '@/hooks/notebook/useNotebooks';
import { useNotebookFolders } from '@/hooks/notebook/useNotebookFolders';
import { useElementCollections } from '@/hooks/notebook/useNotebookElements';
import { usePaperTemplates } from '@/hooks/notebook/useNotebookTemplates';
import { useNotebookPreferences } from '@/hooks/notebook/useNotebookPreferences';

function Section({
  title,
  state,
  children,
}: {
  title: string;
  state: { isLoading: boolean; error: unknown; data: unknown };
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-lg border border-border p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {state.isLoading && <p className="text-muted-foreground">⏳ Carregando...</p>}
      {state.error ? (
        <p className="text-destructive">❌ {String(state.error)}</p>
      ) : null}
      {!state.isLoading && !state.error && children}
    </div>
  );
}

export default function CadernoDevTest() {
  const notebooks = useNotebooks();
  const folders = useNotebookFolders();
  const collections = useElementCollections();
  const paperTemplates = usePaperTemplates('paper');
  const coverTemplates = usePaperTemplates('cover');
  const preferences = useNotebookPreferences();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔬 Caderno Dev Test — FASE 2.1</h1>

      <Section title={`Notebooks (${notebooks.data?.length ?? '?'})`} state={notebooks}>
        <pre className="text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
          {JSON.stringify(notebooks.data, null, 2)}
        </pre>
      </Section>

      <Section title={`Folders (${folders.data?.length ?? '?'})`} state={folders}>
        <pre className="text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
          {JSON.stringify(folders.data, null, 2)}
        </pre>
      </Section>

      <Section title={`Element Collections (${collections.data?.length ?? '?'})`} state={collections}>
        <pre className="text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
          {JSON.stringify(collections.data, null, 2)}
        </pre>
      </Section>

      <Section title={`Paper Templates (${paperTemplates.data?.length ?? '?'})`} state={paperTemplates}>
        <pre className="text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
          {JSON.stringify(paperTemplates.data, null, 2)}
        </pre>
      </Section>

      <Section title={`Cover Templates (${coverTemplates.data?.length ?? '?'})`} state={coverTemplates}>
        <pre className="text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
          {JSON.stringify(coverTemplates.data, null, 2)}
        </pre>
      </Section>

      <Section title="User Preferences" state={preferences}>
        <pre className="text-xs overflow-auto max-h-48 bg-muted p-2 rounded">
          {JSON.stringify(preferences.data, null, 2)}
        </pre>
      </Section>
    </div>
  );
}
