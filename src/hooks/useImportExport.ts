import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Deck, Flashcard } from '@/types/flashcard';
import { Note, NoteType } from '@/types/note';
import { format } from 'date-fns';

const BACKUP_VERSION = '1.0.0';

interface ImportData {
  deckId: string;
  noteTypeId: string;
  cards: Array<{ front: string; back: string; tags?: string[] }>;
}

interface BackupData {
  version: string;
  exportedAt: string;
  decks: any[];
  cards: any[];
  notes: any[];
  noteTypes: any[];
  reviews: any[];
  sessions: any[];
}

export function useImportExport(
  decks: Deck[],
  cards: Flashcard[],
  notes: Note[],
  noteTypes: NoteType[],
  refreshData: () => Promise<void>
) {
  const { userId } = useAuthContext();

  // Import cards from CSV data
  const importCards = useCallback(async (data: ImportData) => {
    if (!userId) throw new Error('Usuário não autenticado');

    const deck = decks.find(d => d.id === data.deckId);
    if (!deck) throw new Error('Baralho não encontrado');

    const noteType = noteTypes.find(nt => nt.id === data.noteTypeId);
    if (!noteType) throw new Error('Tipo de nota não encontrado');

    // Create notes and cards
    for (const cardData of data.cards) {
      // Create note
      const noteFields: Record<string, string> = {};
      if (noteType.isCloze) {
        noteFields['Text'] = cardData.front;
      } else {
        noteFields['Front'] = cardData.front;
        noteFields['Back'] = cardData.back;
      }

      const { data: noteResult, error: noteError } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          deck_id: data.deckId,
          note_type_id: data.noteTypeId,
          fields: noteFields,
          tags: cardData.tags || [],
        })
        .select()
        .single();

      if (noteError) {
        console.error('Error creating note:', noteError);
        continue;
      }

      // Create card(s)
      const now = new Date().toISOString();
      const { error: cardError } = await supabase
        .from('flashcards')
        .insert({
          user_id: userId,
          deck_id: data.deckId,
          note_id: noteResult.id,
          front: cardData.front,
          back: cardData.back,
          card_state: 'new',
          ease_factor: deck.config?.startingEase || 2.5,
          interval_days: 0,
          repetitions: 0,
          due: now,
          next_review: now,
        });

      if (cardError) {
        console.error('Error creating card:', cardError);
      }
    }

    await refreshData();
  }, [userId, decks, noteTypes, refreshData]);

  // Export deck(s) to CSV or JSON
  const exportData = useCallback(async (deckId: string | 'all', format: 'csv' | 'json') => {
    const targetCards = deckId === 'all' 
      ? cards 
      : cards.filter(c => c.deckId === deckId);

    const targetDecks = deckId === 'all' 
      ? decks 
      : decks.filter(d => d.id === deckId);

    if (format === 'csv') {
      // Create CSV content
      const headers = ['front', 'back', 'deck', 'state', 'interval', 'ease', 'tags'];
      const rows = targetCards.map(card => {
        const deck = decks.find(d => d.id === card.deckId);
        const note = notes.find(n => n.id === (card as any).noteId);
        return [
          escapeCSV(card.front),
          escapeCSV(card.back),
          escapeCSV(deck?.title || ''),
          card.cardState || 'new',
          String(card.interval || 0),
          String(card.easeFactor || 2.5),
          escapeCSV(note?.tags?.join(', ') || ''),
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      downloadFile(csvContent, `flashcards-export-${Date.now()}.csv`, 'text/csv');
    } else {
      // JSON format - full backup style export
      const exportData = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        decks: targetDecks.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          emoji: d.emoji,
          color: d.color,
          parentDeckId: d.parentDeckId,
          config: d.config,
        })),
        cards: targetCards.map(c => ({
          id: c.id,
          deckId: c.deckId,
          front: c.front,
          back: c.back,
          cardState: c.cardState,
          interval: c.interval,
          easeFactor: c.easeFactor,
          repetitions: c.repetitions,
          lapses: c.lapses,
          due: c.due,
          nextReview: c.nextReview,
        })),
        notes: notes.filter(n => {
          const card = targetCards.find(c => (c as any).noteId === n.id);
          return !!card;
        }),
      };

      downloadFile(
        JSON.stringify(exportData, null, 2), 
        `flashcards-export-${Date.now()}.json`, 
        'application/json'
      );
    }
  }, [cards, decks, notes]);

  // Create full backup
  const createBackup = useCallback(async (): Promise<BackupData> => {
    if (!userId) throw new Error('Usuário não autenticado');

    // Fetch all reviews
    const { data: reviews } = await supabase
      .from('flashcard_reviews')
      .select('*')
      .eq('user_id', userId);

    // Fetch all sessions
    const { data: sessions } = await supabase
      .from('flashcard_sessions')
      .select('*')
      .eq('user_id', userId);

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      decks: decks.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        emoji: d.emoji,
        color: d.color,
        parentDeckId: d.parentDeckId,
        config: d.config,
        fullName: d.fullName,
      })),
      cards: cards.map(c => ({
        id: c.id,
        deckId: c.deckId,
        front: c.front,
        back: c.back,
        sourceType: c.sourceType,
        cardState: c.cardState,
        currentStep: c.currentStep,
        stepsLeft: c.stepsLeft,
        interval: c.interval,
        easeFactor: c.easeFactor,
        repetitions: c.repetitions,
        lapses: c.lapses,
        due: c.due,
        nextReview: c.nextReview,
        buriedUntil: c.buriedUntil,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      notes: notes.map(n => ({
        id: n.id,
        deckId: n.deckId,
        noteTypeId: n.noteTypeId,
        fields: n.fields,
        tags: n.tags,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      })),
      noteTypes: noteTypes.filter(nt => !nt.isBuiltin).map(nt => ({
        id: nt.id,
        name: nt.name,
        fields: nt.fields,
        isCloze: nt.isCloze,
      })),
      reviews: reviews || [],
      sessions: sessions || [],
    };
  }, [userId, decks, cards, notes, noteTypes]);

  // Restore from backup
  const restoreBackup = useCallback(async (data: BackupData) => {
    if (!userId) throw new Error('Usuário não autenticado');

    // Validate version compatibility
    if (!data.version) {
      throw new Error('Versão do backup não encontrada');
    }

    // Create ID mapping for new IDs
    const deckIdMap = new Map<string, string>();
    const noteTypeIdMap = new Map<string, string>();
    const noteIdMap = new Map<string, string>();

    // Restore decks (create with new IDs if conflict)
    for (const deck of data.decks || []) {
      // Check if deck already exists
      const existing = decks.find(d => d.id === deck.id);
      if (existing) {
        deckIdMap.set(deck.id, deck.id);
        continue;
      }

      const newId = crypto.randomUUID();
      const { error } = await supabase
        .from('flashcard_decks')
        .insert({
          id: newId,
          user_id: userId,
          title: deck.title,
          description: deck.description || null,
          emoji: deck.emoji,
          color: deck.color,
          parent_deck_id: deck.parentDeckId ? deckIdMap.get(deck.parentDeckId) || deck.parentDeckId : null,
          learning_steps: deck.config?.learningSteps,
          relearning_steps: deck.config?.relearnSteps,
          graduating_interval: deck.config?.graduatingInterval,
          easy_interval: deck.config?.easyInterval,
          max_interval: deck.config?.maxInterval,
          starting_ease: deck.config?.startingEase,
        });

      if (error) {
        console.error('Error restoring deck:', error);
      } else {
        deckIdMap.set(deck.id, newId);
      }
    }

    // Restore note types
    for (const noteType of data.noteTypes || []) {
      const existing = noteTypes.find(nt => nt.id === noteType.id);
      if (existing) {
        noteTypeIdMap.set(noteType.id, noteType.id);
        continue;
      }

      const newId = crypto.randomUUID();
      const { error } = await supabase
        .from('note_types')
        .insert({
          id: newId,
          user_id: userId,
          name: noteType.name,
          fields: noteType.fields,
          is_cloze: noteType.isCloze,
          is_builtin: false,
        });

      if (error) {
        console.error('Error restoring note type:', error);
      } else {
        noteTypeIdMap.set(noteType.id, newId);
      }
    }

    // Restore notes
    for (const note of data.notes || []) {
      const existing = notes.find(n => n.id === note.id);
      if (existing) {
        noteIdMap.set(note.id, note.id);
        continue;
      }

      const newId = crypto.randomUUID();
      const mappedDeckId = deckIdMap.get(note.deckId) || note.deckId;
      const mappedNoteTypeId = noteTypeIdMap.get(note.noteTypeId) || note.noteTypeId;

      const { error } = await supabase
        .from('notes')
        .insert({
          id: newId,
          user_id: userId,
          deck_id: mappedDeckId,
          note_type_id: mappedNoteTypeId,
          fields: note.fields,
          tags: note.tags || [],
        });

      if (error) {
        console.error('Error restoring note:', error);
      } else {
        noteIdMap.set(note.id, newId);
      }
    }

    // Restore cards
    for (const card of data.cards || []) {
      const existing = cards.find(c => c.id === card.id);
      if (existing) continue;

      const mappedDeckId = deckIdMap.get(card.deckId) || card.deckId;

      const { error } = await supabase
        .from('flashcards')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          deck_id: mappedDeckId,
          front: card.front,
          back: card.back,
          source_type: card.sourceType || 'manual',
          card_state: card.cardState || 'new',
          current_step: card.currentStep || 0,
          steps_left: card.stepsLeft || 0,
          interval_days: card.interval || 0,
          ease_factor: card.easeFactor || 2.5,
          repetitions: card.repetitions || 0,
          lapses: card.lapses || 0,
          due: card.due,
          next_review: card.nextReview,
        });

      if (error) {
        console.error('Error restoring card:', error);
      }
    }

    // Refresh data after restore
    await refreshData();
  }, [userId, decks, cards, notes, noteTypes, refreshData]);

  return {
    importCards,
    exportData,
    createBackup,
    restoreBackup,
  };
}

// Helper functions
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
