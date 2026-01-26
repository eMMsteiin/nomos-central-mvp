// ============================================================================
// BLOCO 3: Notes, Templates e Cloze Types
// ============================================================================

// Field definition for a note type
export interface NoteTypeField {
  name: string;
  ord: number;
}

// Note Type - defines the structure and templates for notes
export interface NoteType {
  id: string;
  userId: string;
  name: string;
  fields: NoteTypeField[];
  isCloze: boolean;
  isBuiltin: boolean;
  sortFieldIdx: number;
  createdAt: string;
  updatedAt: string;
}

// Card Template - defines how cards are generated from a note
export interface CardTemplate {
  id: string;
  noteTypeId: string;
  name: string;
  frontTemplate: string;
  backTemplate: string;
  ord: number;
  css: string;
  createdAt: string;
}

// Note - the base content unit that generates cards
export interface Note {
  id: string;
  userId: string;
  deckId: string;
  noteTypeId: string;
  fields: Record<string, string>; // { fieldName: value }
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Built-in note type names
export const BUILTIN_NOTE_TYPES = {
  BASIC: 'Basic',
  BASIC_REVERSED: 'Basic (and reversed card)',
  CLOZE: 'Cloze',
} as const;

// Default fields for each built-in type
export const DEFAULT_NOTE_TYPE_FIELDS: Record<string, NoteTypeField[]> = {
  [BUILTIN_NOTE_TYPES.BASIC]: [
    { name: 'Front', ord: 0 },
    { name: 'Back', ord: 1 },
  ],
  [BUILTIN_NOTE_TYPES.BASIC_REVERSED]: [
    { name: 'Front', ord: 0 },
    { name: 'Back', ord: 1 },
  ],
  [BUILTIN_NOTE_TYPES.CLOZE]: [
    { name: 'Text', ord: 0 },
    { name: 'Extra', ord: 1 },
  ],
};

// Default templates for each built-in type
export const DEFAULT_CARD_TEMPLATES: Record<string, Omit<CardTemplate, 'id' | 'noteTypeId' | 'createdAt'>[]> = {
  [BUILTIN_NOTE_TYPES.BASIC]: [
    {
      name: 'Card 1',
      frontTemplate: '{{Front}}',
      backTemplate: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}',
      ord: 0,
      css: '.card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}',
    },
  ],
  [BUILTIN_NOTE_TYPES.BASIC_REVERSED]: [
    {
      name: 'Card 1',
      frontTemplate: '{{Front}}',
      backTemplate: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Back}}',
      ord: 0,
      css: '.card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}',
    },
    {
      name: 'Card 2',
      frontTemplate: '{{Back}}',
      backTemplate: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Front}}',
      ord: 1,
      css: '.card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}',
    },
  ],
  [BUILTIN_NOTE_TYPES.CLOZE]: [
    {
      name: 'Cloze',
      frontTemplate: '{{cloze:Text}}',
      backTemplate: '{{cloze:Text}}\n\n<hr id="extra">\n\n{{Extra}}',
      ord: 0,
      css: '.card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}\n\n.cloze {\n  font-weight: bold;\n  color: blue;\n}',
    },
  ],
};

// Helper to check if a note type is cloze
export function isClozeNoteType(noteType: NoteType): boolean {
  return noteType.isCloze;
}

// Helper to get field names from a note type
export function getFieldNames(noteType: NoteType): string[] {
  return noteType.fields
    .sort((a, b) => a.ord - b.ord)
    .map(f => f.name);
}
