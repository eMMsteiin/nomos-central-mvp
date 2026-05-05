import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DeckSource {
  id: string;
  deckId: string;
  fileName: string;
  fileType: string;
  storagePath: string;
  extractedText: string | null;
  pageCount: number | null;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SOURCES_PER_DECK = 5;
const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/heic': 'image',
  'image/webp': 'image',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export function useDeckSources(deckId: string | null) {
  const { userId } = useAuthContext();
  const [sources, setSources] = useState<DeckSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadSources = useCallback(async () => {
    if (!deckId || !userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('deck_sources')
        .select('*')
        .eq('deck_id', deckId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSources((data || []).map(s => ({
        id: s.id,
        deckId: s.deck_id,
        fileName: s.file_name,
        fileType: s.file_type,
        storagePath: s.storage_path,
        extractedText: s.extracted_text,
        pageCount: s.page_count,
        status: s.status as DeckSource['status'],
        createdAt: s.created_at,
      })));
    } catch (err) {
      console.error('Error loading sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [deckId, userId]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  // Poll for processing sources
  useEffect(() => {
    const processing = sources.filter(s => s.status === 'processing');
    if (processing.length === 0) return;

    const interval = setInterval(loadSources, 3000);
    return () => clearInterval(interval);
  }, [sources, loadSources]);

  const uploadSource = async (file: File) => {
    if (!deckId || !userId) return;

    // Validations
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 10MB por fonte.');
      return;
    }

    // Some browsers send empty file.type for .pptx/.docx/.heic — fall back to extension.
    const extFallback: Record<string, string> = {
      pdf: 'pdf', png: 'image', jpg: 'image', jpeg: 'image', heic: 'image', webp: 'image',
      pptx: 'pptx', docx: 'docx',
    };
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const fileType = ACCEPTED_TYPES[file.type] || extFallback[ext];
    if (!fileType) {
      toast.error('Formato não suportado. Use PDF, imagem, PPTX ou DOCX.');
      return;
    }

    if (sources.length >= MAX_SOURCES_PER_DECK) {
      toast.error(`Máximo de ${MAX_SOURCES_PER_DECK} fontes por baralho.`);
      return;
    }

    setIsUploading(true);
    try {
      // CRITICAL: get auth.uid() fresh from current session.
      // RLS policy on storage.objects requires (storage.foldername(name))[1] = auth.uid().
      // Using a stale userId from context can mismatch if the session was rotated.
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Sessão expirada. Recarregue a página.');
        return;
      }
      const authUid = currentUser.id;

      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'bin';
      const storagePath = `${authUid}/${deckId}/${crypto.randomUUID()}.${safeExt}`;

      // Upload to storage. Pass contentType explicitly because some browsers
      // send empty type for .pptx/.heic and storage rejects with generic errors.
      const { error: uploadError } = await supabase.storage
        .from('deck-sources')
        .upload(storagePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError, { storagePath, authUid, contextUserId: userId });
        throw uploadError;
      }

      // Create record
      const { data: source, error: insertError } = await supabase
        .from('deck_sources')
        .insert({
          deck_id: deckId,
          user_id: authUid,
          file_name: file.name,
          file_type: fileType,
          storage_path: storagePath,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state immediately
      setSources(prev => [...prev, {
        id: source.id,
        deckId: source.deck_id,
        fileName: source.file_name,
        fileType: source.file_type,
        storagePath: source.storage_path,
        extractedText: null,
        pageCount: null,
        status: 'processing',
        createdAt: source.created_at,
      }]);

      // Trigger processing
      supabase.functions.invoke('process-deck-source', {
        body: {
          source_id: source.id,
          storage_path: storagePath,
          file_type: fileType,
        },
      }).then(async ({ data, error }) => {
        if (error) {
          let msg = (error as { message?: string })?.message || String(error);
          try {
            const body = await (error as { context?: Response })?.context?.json?.();
            if (body?.error) msg = body.error;
          } catch {}
          console.error('Process error:', msg);
          toast.error(`Erro: ${msg}`);
        } else if (data?.error) {
          toast.error(`Erro: ${data.error}`);
        }
        loadSources();
      });

      toast.success(`"${file.name}" enviado com sucesso`);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteSource = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    try {
      // Delete from storage
      await supabase.storage.from('deck-sources').remove([source.storagePath]);
      // Delete record
      await supabase.from('deck_sources').delete().eq('id', sourceId);
      setSources(prev => prev.filter(s => s.id !== sourceId));
      toast.success('Fonte removida');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Erro ao remover fonte');
    }
  };

  const retrySource = async (sourceId: string) => {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;

    await supabase.from('deck_sources').update({ status: 'processing' }).eq('id', sourceId);
    setSources(prev => prev.map(s => s.id === sourceId ? { ...s, status: 'processing' as const } : s));

    supabase.functions.invoke('process-deck-source', {
      body: {
        source_id: sourceId,
        storage_path: source.storagePath,
        file_type: source.fileType,
      },
    }).then(async ({ data, error }) => {
      if (error) {
        let msg = (error as { message?: string })?.message || String(error);
        try {
          const body = await (error as { context?: Response })?.context?.json?.();
          if (body?.error) msg = body.error;
        } catch {}
        toast.error(`Erro: ${msg}`);
      } else if (data?.error) {
        toast.error(`Erro: ${data.error}`);
      }
      loadSources();
    });
  };

  const generateFromSources = async (focus?: string, selectedSourceIds?: string[], cardType: string = 'basic'): Promise<Array<{ front: string; back: string }> | null> => {
    if (!deckId) return null;

    const readySources = sources.filter(s => s.status === 'ready');
    const targetSources = selectedSourceIds
      ? readySources.filter(s => selectedSourceIds.includes(s.id))
      : readySources;

    if (targetSources.length === 0) {
      toast.error('Nenhuma fonte pronta para gerar flashcards.');
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcards-from-sources', {
        body: {
          deck_id: deckId,
          source_ids: targetSources.map(s => s.id),
          max_cards: 15,
          focus: focus || undefined,
          card_type: cardType,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data?.flashcards || [];
    } catch (err) {
      console.error('Generate error:', err);
      toast.error('Erro ao gerar flashcards das fontes');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const readyCount = sources.filter(s => s.status === 'ready').length;
  const processingCount = sources.filter(s => s.status === 'processing').length;

  return {
    sources,
    isLoading,
    isUploading,
    isGenerating,
    readyCount,
    processingCount,
    canUpload: sources.length < MAX_SOURCES_PER_DECK,
    canGenerate: readyCount > 0 && !isGenerating,
    uploadSource,
    deleteSource,
    retrySource,
    generateFromSources,
  };
}
