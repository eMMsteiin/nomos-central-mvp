// ============================================================================
// BLOCO 3: Notes Hook
// Manages notes, note types, and card templates
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Note,
  NoteType,
  CardTemplate,
  NoteTypeField,
  BUILTIN_NOTE_TYPES,
  DEFAULT_NOTE_TYPE_FIELDS,
  DEFAULT_CARD_TEMPLATES,
} from '@/types/note';
import { Flashcard, CardState, DEFAULT_DECK_CONFIG } from '@/types/flashcard';
import { generateCardsFromNote } from '@/utils/templateRenderer';
import { parseClozeText } from '@/utils/clozeParser';

export function useNotes() {
  const { userId } = useAuthContext();
  const [noteTypes, setNoteTypes] = useState<NoteType[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from database
  useEffect(() => {
    if (!userId) return;
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadNoteTypes(),
        loadTemplates(),
        loadNotes(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // NOTE TYPES
  // ============================================================================

  const loadNoteTypes = async () => {
    const { data, error } = await supabase
      .from('note_types')
      .select('*')
      .eq('user_id', userId)
      .order('name');

    if (error) {
      console.error('Error loading note types:', error);
      return;
    }

    if (!data || data.length === 0) {
      // Create built-in note types for new users
      await createBuiltinNoteTypes();
      return;
    }

    const transformed: NoteType[] = data.map(nt => ({
      id: nt.id,
      userId: nt.user_id,
      name: nt.name,
      fields: (nt.fields as unknown as NoteTypeField[]) || [],
      isCloze: nt.is_cloze,
      isBuiltin: nt.is_builtin,
      sortFieldIdx: nt.sort_field_idx,
      createdAt: nt.created_at,
      updatedAt: nt.updated_at,
    }));

    setNoteTypes(transformed);
  };

  const createBuiltinNoteTypes = async () => {
    const builtinTypes = [
      { name: BUILTIN_NOTE_TYPES.BASIC, isCloze: false },
      { name: BUILTIN_NOTE_TYPES.BASIC_REVERSED, isCloze: false },
      { name: BUILTIN_NOTE_TYPES.CLOZE, isCloze: true },
    ];

    const createdTypes: NoteType[] = [];

    for (const type of builtinTypes) {
      const fields = DEFAULT_NOTE_TYPE_FIELDS[type.name];
      
      const { data, error } = await supabase
        .from('note_types')
        .insert([{
          user_id: userId,
          name: type.name,
          fields: JSON.parse(JSON.stringify(fields)),
          is_cloze: type.isCloze,
          is_builtin: true,
        }])
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${type.name}:`, error);
        continue;
      }

      const newType: NoteType = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        fields: fields,
        isCloze: data.is_cloze,
        isBuiltin: data.is_builtin,
        sortFieldIdx: data.sort_field_idx,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      createdTypes.push(newType);

      // Create default templates for this note type
      const defaultTemplates = DEFAULT_CARD_TEMPLATES[type.name];
      for (const tpl of defaultTemplates) {
        await supabase.from('card_templates').insert({
          note_type_id: data.id,
          name: tpl.name,
          front_template: tpl.frontTemplate,
          back_template: tpl.backTemplate,
          ord: tpl.ord,
          css: tpl.css,
        });
      }
    }

    setNoteTypes(createdTypes);
    await loadTemplates(); // Reload templates after creating them
  };

  const createNoteType = useCallback(async (
    name: string,
    fields: NoteTypeField[],
    isCloze: boolean = false
  ): Promise<NoteType> => {
    const { data, error } = await supabase
      .from('note_types')
      .insert([{
        user_id: userId,
        name,
        fields: JSON.parse(JSON.stringify(fields)),
        is_cloze: isCloze,
        is_builtin: false,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating note type:', error);
      throw error;
    }

    const newType: NoteType = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      fields: fields,
      isCloze: data.is_cloze,
      isBuiltin: false,
      sortFieldIdx: data.sort_field_idx,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    setNoteTypes(prev => [...prev, newType]);
    return newType;
  }, [userId]);

  const updateNoteType = useCallback(async (id: string, updates: Partial<NoteType>) => {
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.fields !== undefined) dbUpdates.fields = updates.fields;
    if (updates.sortFieldIdx !== undefined) dbUpdates.sort_field_idx = updates.sortFieldIdx;

    const { error } = await supabase
      .from('note_types')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating note type:', error);
      throw error;
    }

    setNoteTypes(prev =>
      prev.map(nt => (nt.id === id ? { ...nt, ...updates } : nt))
    );
  }, [userId]);

  const deleteNoteType = useCallback(async (id: string) => {
    const noteType = noteTypes.find(nt => nt.id === id);
    if (noteType?.isBuiltin) {
      throw new Error('Cannot delete built-in note type');
    }

    const { error } = await supabase
      .from('note_types')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting note type:', error);
      throw error;
    }

    setNoteTypes(prev => prev.filter(nt => nt.id !== id));
    setTemplates(prev => prev.filter(t => t.noteTypeId !== id));
  }, [noteTypes, userId]);

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('card_templates')
      .select('*')
      .order('ord');

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    const transformed: CardTemplate[] = data.map(t => ({
      id: t.id,
      noteTypeId: t.note_type_id,
      name: t.name,
      frontTemplate: t.front_template,
      backTemplate: t.back_template,
      ord: t.ord,
      css: t.css || '',
      createdAt: t.created_at,
    }));

    setTemplates(transformed);
  };

  const createTemplate = useCallback(async (
    noteTypeId: string,
    name: string,
    frontTemplate: string,
    backTemplate: string,
    css: string = ''
  ): Promise<CardTemplate> => {
    const existingTemplates = templates.filter(t => t.noteTypeId === noteTypeId);
    const ord = existingTemplates.length;

    const { data, error } = await supabase
      .from('card_templates')
      .insert({
        note_type_id: noteTypeId,
        name,
        front_template: frontTemplate,
        back_template: backTemplate,
        ord,
        css,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    const newTemplate: CardTemplate = {
      id: data.id,
      noteTypeId: data.note_type_id,
      name: data.name,
      frontTemplate: data.front_template,
      backTemplate: data.back_template,
      ord: data.ord,
      css: data.css || '',
      createdAt: data.created_at,
    };

    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, [templates]);

  const updateTemplate = useCallback(async (id: string, updates: Partial<CardTemplate>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.frontTemplate !== undefined) dbUpdates.front_template = updates.frontTemplate;
    if (updates.backTemplate !== undefined) dbUpdates.back_template = updates.backTemplate;
    if (updates.css !== undefined) dbUpdates.css = updates.css;
    if (updates.ord !== undefined) dbUpdates.ord = updates.ord;

    const { error } = await supabase
      .from('card_templates')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    setTemplates(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('card_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }

    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const getTemplatesForNoteType = useCallback((noteTypeId: string): CardTemplate[] => {
    return templates
      .filter(t => t.noteTypeId === noteTypeId)
      .sort((a, b) => a.ord - b.ord);
  }, [templates]);

  // ============================================================================
  // NOTES
  // ============================================================================

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading notes:', error);
      return;
    }

    const transformed: Note[] = data.map(n => ({
      id: n.id,
      userId: n.user_id,
      deckId: n.deck_id,
      noteTypeId: n.note_type_id,
      fields: (n.fields as Record<string, string>) || {},
      tags: n.tags || [],
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    }));

    setNotes(transformed);
  };

  /**
   * Create a note and generate all associated cards
   * Returns the note and the generated flashcards
   */
  const createNote = useCallback(async (
    deckId: string,
    noteTypeId: string,
    fields: Record<string, string>,
    tags: string[] = []
  ): Promise<{ note: Note; cards: Flashcard[] }> => {
    const noteType = noteTypes.find(nt => nt.id === noteTypeId);
    if (!noteType) {
      throw new Error('Note type not found');
    }

    const noteTemplates = getTemplatesForNoteType(noteTypeId);

    // Create the note
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        deck_id: deckId,
        note_type_id: noteTypeId,
        fields,
        tags,
      })
      .select()
      .single();

    if (noteError) {
      console.error('Error creating note:', noteError);
      throw noteError;
    }

    const newNote: Note = {
      id: noteData.id,
      userId: noteData.user_id,
      deckId: noteData.deck_id,
      noteTypeId: noteData.note_type_id,
      fields,
      tags,
      createdAt: noteData.created_at,
      updatedAt: noteData.updated_at,
    };

    // Generate cards from the note
    const cardsToGenerate = generateCardsFromNote(newNote, noteType, noteTemplates);
    const now = new Date().toISOString();

    const cardsToInsert = cardsToGenerate.map(cardData => ({
      deck_id: deckId,
      user_id: userId,
      front: cardData.front,
      back: cardData.back,
      source_type: 'manual',
      note_id: newNote.id,
      template_ord: cardData.templateOrd,
      next_review: now,
      interval_days: 0,
      ease_factor: DEFAULT_DECK_CONFIG.startingEase,
      repetitions: 0,
      card_state: 'new' as CardState,
      current_step: 0,
      steps_left: 0,
      due: now,
      lapses: 0,
    }));

    const { data: cardsData, error: cardsError } = await supabase
      .from('flashcards')
      .insert(cardsToInsert)
      .select();

    if (cardsError) {
      console.error('Error creating cards from note:', cardsError);
      throw cardsError;
    }

    const generatedCards: Flashcard[] = cardsData.map(c => ({
      id: c.id,
      deckId: c.deck_id,
      front: c.front,
      back: c.back,
      sourceType: 'manual' as const,
      nextReview: c.next_review,
      interval: c.interval_days,
      easeFactor: Number(c.ease_factor),
      repetitions: c.repetitions,
      cardState: c.card_state as CardState,
      currentStep: c.current_step,
      stepsLeft: c.steps_left,
      due: c.due,
      queuePosition: c.queue_position,
      lapses: c.lapses,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    setNotes(prev => [newNote, ...prev]);

    return { note: newNote, cards: generatedCards };
  }, [userId, noteTypes, getTemplatesForNoteType]);

  /**
   * Update a note and regenerate cards if necessary
   */
  const updateNote = useCallback(async (
    noteId: string,
    fieldUpdates: Record<string, string>
  ): Promise<{ note: Note; cards: Flashcard[] }> => {
    const existingNote = notes.find(n => n.id === noteId);
    if (!existingNote) {
      throw new Error('Note not found');
    }

    const noteType = noteTypes.find(nt => nt.id === existingNote.noteTypeId);
    if (!noteType) {
      throw new Error('Note type not found');
    }

    const noteTemplates = getTemplatesForNoteType(existingNote.noteTypeId);
    const updatedFields = { ...existingNote.fields, ...fieldUpdates };

    // Update the note
    const { error: noteError } = await supabase
      .from('notes')
      .update({
        fields: updatedFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (noteError) {
      console.error('Error updating note:', noteError);
      throw noteError;
    }

    const updatedNote: Note = {
      ...existingNote,
      fields: updatedFields,
      updatedAt: new Date().toISOString(),
    };

    // Get existing cards for this note
    const { data: existingCards } = await supabase
      .from('flashcards')
      .select('*')
      .eq('note_id', noteId);

    // Generate new card content
    const newCardData = generateCardsFromNote(updatedNote, noteType, noteTemplates);

    // Update existing cards with new content (preserve scheduling)
    const updatedCards: Flashcard[] = [];

    for (const newCard of newCardData) {
      const existingCard = existingCards?.find(c => c.template_ord === newCard.templateOrd);

      if (existingCard) {
        // Update existing card content only
        await supabase
          .from('flashcards')
          .update({
            front: newCard.front,
            back: newCard.back,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCard.id);

        updatedCards.push({
          ...existingCard,
          front: newCard.front,
          back: newCard.back,
          deckId: existingCard.deck_id,
          sourceType: existingCard.source_type as 'manual' | 'ai' | 'notebook',
          nextReview: existingCard.next_review,
          interval: existingCard.interval_days,
          easeFactor: Number(existingCard.ease_factor),
          cardState: existingCard.card_state as CardState,
          currentStep: existingCard.current_step,
          stepsLeft: existingCard.steps_left,
          queuePosition: existingCard.queue_position,
          createdAt: existingCard.created_at,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create new card (for additional cloze deletions)
        const now = new Date().toISOString();
        const { data: newCardDb, error } = await supabase
          .from('flashcards')
          .insert({
            deck_id: existingNote.deckId,
            user_id: userId,
            front: newCard.front,
            back: newCard.back,
            source_type: 'manual',
            note_id: noteId,
            template_ord: newCard.templateOrd,
            next_review: now,
            interval_days: 0,
            ease_factor: DEFAULT_DECK_CONFIG.startingEase,
            repetitions: 0,
            card_state: 'new',
            current_step: 0,
            steps_left: 0,
            due: now,
            lapses: 0,
          })
          .select()
          .single();

        if (!error && newCardDb) {
          updatedCards.push({
            id: newCardDb.id,
            deckId: newCardDb.deck_id,
            front: newCardDb.front,
            back: newCardDb.back,
            sourceType: 'manual',
            nextReview: newCardDb.next_review,
            interval: newCardDb.interval_days,
            easeFactor: Number(newCardDb.ease_factor),
            repetitions: newCardDb.repetitions,
            cardState: newCardDb.card_state as CardState,
            currentStep: newCardDb.current_step,
            stepsLeft: newCardDb.steps_left,
            due: newCardDb.due,
            queuePosition: newCardDb.queue_position,
            lapses: newCardDb.lapses,
            createdAt: newCardDb.created_at,
            updatedAt: newCardDb.updated_at,
          });
        }
      }
    }

    // Remove cards that no longer exist (e.g., removed cloze deletions)
    const cardOrdsToKeep = new Set(newCardData.map(c => c.templateOrd));
    const cardsToDelete = existingCards?.filter(c => !cardOrdsToKeep.has(c.template_ord)) || [];

    for (const cardToDelete of cardsToDelete) {
      await supabase.from('flashcards').delete().eq('id', cardToDelete.id);
    }

    setNotes(prev =>
      prev.map(n => (n.id === noteId ? updatedNote : n))
    );

    return { note: updatedNote, cards: updatedCards };
  }, [notes, noteTypes, getTemplatesForNoteType, userId]);

  /**
   * Delete a note and all its associated cards
   */
  const deleteNote = useCallback(async (noteId: string) => {
    // Cards will be deleted via cascade
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting note:', error);
      throw error;
    }

    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, [userId]);

  /**
   * Move a note to another deck (moves all associated cards too)
   */
  const moveNoteToDeck = useCallback(async (noteId: string, targetDeckId: string) => {
    // Update note's deck
    const { error: noteError } = await supabase
      .from('notes')
      .update({ deck_id: targetDeckId })
      .eq('id', noteId)
      .eq('user_id', userId);

    if (noteError) {
      console.error('Error moving note:', noteError);
      throw noteError;
    }

    // Update all associated cards' deck
    const { error: cardsError } = await supabase
      .from('flashcards')
      .update({ deck_id: targetDeckId })
      .eq('note_id', noteId);

    if (cardsError) {
      console.error('Error moving cards:', cardsError);
      throw cardsError;
    }

    setNotes(prev =>
      prev.map(n => (n.id === noteId ? { ...n, deckId: targetDeckId } : n))
    );
  }, [userId]);

  const getNotesByDeck = useCallback((deckId: string): Note[] => {
    return notes.filter(n => n.deckId === deckId);
  }, [notes]);

  const getNoteById = useCallback((noteId: string): Note | undefined => {
    return notes.find(n => n.id === noteId);
  }, [notes]);

  const getNoteTypeById = useCallback((noteTypeId: string): NoteType | undefined => {
    return noteTypes.find(nt => nt.id === noteTypeId);
  }, [noteTypes]);

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get basic note type for simple card creation
   */
  const getBasicNoteType = useCallback((): NoteType | undefined => {
    return noteTypes.find(nt => nt.name === BUILTIN_NOTE_TYPES.BASIC);
  }, [noteTypes]);

  /**
   * Get cloze note type
   */
  const getClozeNoteType = useCallback((): NoteType | undefined => {
    return noteTypes.find(nt => nt.name === BUILTIN_NOTE_TYPES.CLOZE);
  }, [noteTypes]);

  /**
   * Create a simple basic card (backwards compatible)
   */
  const createBasicNote = useCallback(async (
    deckId: string,
    front: string,
    back: string
  ): Promise<{ note: Note; cards: Flashcard[] }> => {
    const basicType = getBasicNoteType();
    if (!basicType) {
      throw new Error('Basic note type not found');
    }

    return createNote(deckId, basicType.id, {
      Front: front,
      Back: back,
    });
  }, [getBasicNoteType, createNote]);

  /**
   * Create a cloze note
   */
  const createClozeNote = useCallback(async (
    deckId: string,
    text: string,
    extra: string = ''
  ): Promise<{ note: Note; cards: Flashcard[] }> => {
    const clozeType = getClozeNoteType();
    if (!clozeType) {
      throw new Error('Cloze note type not found');
    }

    // Validate cloze syntax
    const parsed = parseClozeText(text);
    if (!parsed.hasValidCloze) {
      throw new Error('No valid cloze deletions found. Use {{c1::text}} syntax.');
    }

    return createNote(deckId, clozeType.id, {
      Text: text,
      Extra: extra,
    });
  }, [getClozeNoteType, createNote]);

  return {
    // State
    noteTypes,
    templates,
    notes,
    isLoading,
    // Note Type operations
    createNoteType,
    updateNoteType,
    deleteNoteType,
    getNoteTypeById,
    getBasicNoteType,
    getClozeNoteType,
    // Template operations
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesForNoteType,
    // Note operations
    createNote,
    updateNote,
    deleteNote,
    moveNoteToDeck,
    getNotesByDeck,
    getNoteById,
    // Convenience methods
    createBasicNote,
    createClozeNote,
    // Reload
    loadData,
  };
}
