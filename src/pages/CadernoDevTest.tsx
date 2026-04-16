import { useState } from 'react';
import { useNotebooks } from '@/hooks/notebook/useNotebooks';
import { useNotebookFolders } from '@/hooks/notebook/useNotebookFolders';
import { useElementCollections } from '@/hooks/notebook/useNotebookElements';
import { usePaperTemplates } from '@/hooks/notebook/useNotebookTemplates';
import { useNotebookPreferences } from '@/hooks/notebook/useNotebookPreferences';
import { useCreateNotebook, useDeleteNotebook, useUpdateNotebook, useToggleNotebookFavorite, useDuplicateNotebook } from '@/hooks/notebook/mutations/useNotebookMutations';
import { useCreateFolder, useDeleteFolder } from '@/hooks/notebook/mutations/useFolderMutations';
import { useCreateNotebookPage } from '@/hooks/notebook/mutations/usePageMutations';
import { useCreateElementCollection } from '@/hooks/notebook/mutations/useElementMutations';
import { useUpsertNotebookPreferences } from '@/hooks/notebook/mutations/usePreferencesMutations';
import { useNotebookRealtime } from '@/hooks/notebook/realtime/useNotebookRealtime';

function TestButton({
  label,
  onClick,
  loading,
  disabled,
  danger,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40 ${
        danger
          ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
          : 'bg-primary text-primary-foreground hover:bg-primary/90'
      }`}
    >
      {loading ? '⏳ ' : ''}{label}
    </button>
  );
}

function MutationTestPanel() {
  const [lastNotebookId, setLastNotebookId] = useState<string | null>(null);
  const [lastFolderId, setLastFolderId] = useState<string | null>(null);

  const createNotebook = useCreateNotebook();
  const updateNotebook = useUpdateNotebook();
  const deleteNotebook = useDeleteNotebook();
  const toggleFav = useToggleNotebookFavorite();
  const duplicate = useDuplicateNotebook();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const createPage = useCreateNotebookPage();
  const createCollection = useCreateElementCollection();
  const upsertPrefs = useUpsertNotebookPreferences();

  return (
    <div className="mb-6 rounded-lg border border-border p-4">
      <h2 className="text-lg font-semibold mb-3">🧪 Testar Mutations</h2>
      <div className="flex flex-wrap gap-2">
        <TestButton
          label="1. Criar notebook"
          onClick={async () => {
            const result = await createNotebook.mutateAsync({
              title: `Teste ${new Date().toLocaleTimeString()}`,
              discipline: 'Filosofia do Direito',
              create_first_page: true,
              first_page_template: 'cornell',
            });
            setLastNotebookId(result.id);
          }}
          loading={createNotebook.isPending}
        />
        <TestButton
          label="2. Renomear"
          onClick={() => {
            if (!lastNotebookId) return alert('Crie um notebook primeiro');
            updateNotebook.mutate({ id: lastNotebookId, patch: { title: 'Renomeado ✓' } });
          }}
          disabled={!lastNotebookId}
          loading={updateNotebook.isPending}
        />
        <TestButton
          label="3. Favoritar"
          onClick={() => {
            if (!lastNotebookId) return;
            toggleFav.mutate({ id: lastNotebookId, is_favorite: true });
          }}
          disabled={!lastNotebookId}
          loading={toggleFav.isPending}
        />
        <TestButton
          label="4. Duplicar"
          onClick={() => {
            if (!lastNotebookId) return;
            duplicate.mutate(lastNotebookId);
          }}
          disabled={!lastNotebookId}
          loading={duplicate.isPending}
        />
        <TestButton
          label="5. Adicionar página"
          onClick={() => {
            if (!lastNotebookId) return;
            createPage.mutate({ notebook_id: lastNotebookId, paper_template: 'grid' });
          }}
          disabled={!lastNotebookId}
          loading={createPage.isPending}
        />
        <TestButton
          label="6. Deletar notebook"
          onClick={() => {
            if (!lastNotebookId) return;
            if (!confirm('Confirmar exclusão?')) return;
            deleteNotebook.mutate(lastNotebookId);
            setLastNotebookId(null);
          }}
          disabled={!lastNotebookId}
          loading={deleteNotebook.isPending}
          danger
        />
        <TestButton
          label="7. Criar pasta"
          onClick={async () => {
            const result = await createFolder.mutateAsync({
              name: `Pasta ${new Date().toLocaleTimeString()}`,
            });
            setLastFolderId(result.id);
          }}
          loading={createFolder.isPending}
        />
        <TestButton
          label="8. Deletar pasta"
          onClick={() => {
            if (!lastFolderId) return;
            deleteFolder.mutate({ folderId: lastFolderId, notebookAction: 'move_to_root' });
            setLastFolderId(null);
          }}
          disabled={!lastFolderId}
          loading={deleteFolder.isPending}
          danger
        />
        <TestButton
          label="9. Criar coleção"
          onClick={() => createCollection.mutate({ name: 'Meus Stickers', icon: 'Star' })}
          loading={createCollection.isPending}
        />
        <TestButton
          label="10. Preferências"
          onClick={() => upsertPrefs.mutate({
            default_pen_style: 'fountain',
            default_pen_color: '#000000',
            default_pen_width: 2,
            fountain_pen_config: { tipSharpness: 50, pressureSensitivity: 50, color: '#000000', width: 2 },
            ball_pen_config: { color: '#000000', width: 2 },
            brush_pen_config: { pressureSensitivity: 70, color: '#000000', width: 4 },
            highlighter_config: { color: '#FDE047', width: 20, opacity: 0.35 },
          })}
          loading={upsertPrefs.isPending}
        />
      </div>
      {lastNotebookId && (
        <p className="text-xs text-muted-foreground mt-2">
          Último notebook: {lastNotebookId.slice(0, 8)}...
        </p>
      )}
      {lastFolderId && (
        <p className="text-xs text-muted-foreground">
          Última pasta: {lastFolderId.slice(0, 8)}...
        </p>
      )}
    </div>
  );
}

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
  useNotebookRealtime();

  const notebooks = useNotebooks();
  const folders = useNotebookFolders();
  const collections = useElementCollections();
  const paperTemplates = usePaperTemplates('paper');
  const coverTemplates = usePaperTemplates('cover');
  const preferences = useNotebookPreferences();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔬 Caderno Dev Test — FASE 2.2</h1>

      <MutationTestPanel />

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
