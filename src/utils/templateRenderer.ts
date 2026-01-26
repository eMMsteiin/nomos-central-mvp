// ============================================================================
// BLOCO 3: Template Renderer
// Renders Anki-style card templates with field substitution
// ============================================================================

import { Note, NoteType, CardTemplate } from '@/types/note';
import { getClozeFront, getClozeBack, parseClozeText } from './clozeParser';

interface RenderContext {
  note: Note;
  noteType: NoteType;
  template: CardTemplate;
  cardOrd: number; // For cloze cards, this is the cloze number
}

/**
 * Render a template with field values
 * Supports:
 * - {{FieldName}} - field substitution
 * - {{FrontSide}} - reference to front of card (for back template)
 * - {{cloze:FieldName}} - cloze deletion rendering
 */
export function renderTemplate(
  template: string,
  fields: Record<string, string>,
  options: {
    isCloze?: boolean;
    clozeNumber?: number;
    showAnswer?: boolean;
    frontSide?: string;
  } = {}
): string {
  let result = template;

  // Handle {{FrontSide}} reference
  if (options.frontSide !== undefined) {
    result = result.replace(/\{\{FrontSide\}\}/gi, options.frontSide);
  }

  // Handle cloze fields: {{cloze:FieldName}}
  const clozeFieldRegex = /\{\{cloze:([^}]+)\}\}/gi;
  result = result.replace(clozeFieldRegex, (_, fieldName) => {
    const fieldValue = fields[fieldName] || fields[fieldName.toLowerCase()] || '';
    if (!fieldValue) return '';

    if (options.clozeNumber !== undefined) {
      if (options.showAnswer) {
        return getClozeBack(fieldValue, options.clozeNumber);
      } else {
        return getClozeFront(fieldValue, options.clozeNumber);
      }
    }
    return fieldValue;
  });

  // Handle regular field substitution: {{FieldName}}
  const fieldRegex = /\{\{([^}:]+)\}\}/g;
  result = result.replace(fieldRegex, (match, fieldName) => {
    // Skip if it's a special reference we've already handled
    if (fieldName.toLowerCase() === 'frontside') return match;
    
    const value = fields[fieldName] || fields[fieldName.toLowerCase()];
    return value !== undefined ? value : '';
  });

  return result;
}

/**
 * Render the front of a card
 */
export function renderCardFront(context: RenderContext): string {
  const { note, noteType, template, cardOrd } = context;

  return renderTemplate(template.frontTemplate, note.fields, {
    isCloze: noteType.isCloze,
    clozeNumber: noteType.isCloze ? cardOrd : undefined,
    showAnswer: false,
  });
}

/**
 * Render the back of a card
 */
export function renderCardBack(context: RenderContext): string {
  const { note, noteType, template, cardOrd } = context;

  // First render the front to use for {{FrontSide}}
  const frontSide = renderCardFront(context);

  return renderTemplate(template.backTemplate, note.fields, {
    isCloze: noteType.isCloze,
    clozeNumber: noteType.isCloze ? cardOrd : undefined,
    showAnswer: true,
    frontSide,
  });
}

/**
 * Calculate how many cards a note will generate
 */
export function calculateCardCount(
  note: Note,
  noteType: NoteType,
  templates: CardTemplate[]
): number {
  if (noteType.isCloze) {
    // For cloze notes, count unique cloze numbers in the Text field
    const textField = note.fields['Text'] || note.fields['text'] || '';
    const parsed = parseClozeText(textField);
    return parsed.uniqueNumbers.length;
  }

  // For regular notes, one card per template
  return templates.filter(t => t.noteTypeId === noteType.id).length;
}

/**
 * Generate card data (front/back) for all cards from a note
 */
export function generateCardsFromNote(
  note: Note,
  noteType: NoteType,
  templates: CardTemplate[]
): Array<{ front: string; back: string; templateOrd: number }> {
  const noteTemplates = templates
    .filter(t => t.noteTypeId === noteType.id)
    .sort((a, b) => a.ord - b.ord);

  if (noteType.isCloze) {
    // For cloze notes, generate one card per cloze number
    const textField = note.fields['Text'] || note.fields['text'] || '';
    const parsed = parseClozeText(textField);
    const clozeTemplate = noteTemplates[0]; // Cloze only has one template

    if (!clozeTemplate) return [];

    return parsed.uniqueNumbers.map(clozeNumber => {
      const context: RenderContext = {
        note,
        noteType,
        template: clozeTemplate,
        cardOrd: clozeNumber,
      };

      return {
        front: renderCardFront(context),
        back: renderCardBack(context),
        templateOrd: clozeNumber,
      };
    });
  }

  // For regular notes, generate one card per template
  return noteTemplates.map(template => {
    const context: RenderContext = {
      note,
      noteType,
      template,
      cardOrd: template.ord,
    };

    return {
      front: renderCardFront(context),
      back: renderCardBack(context),
      templateOrd: template.ord,
    };
  });
}

/**
 * Preview template rendering with sample data
 */
export function previewTemplate(
  template: CardTemplate,
  sampleFields: Record<string, string>,
  isCloze: boolean = false,
  clozeNumber: number = 1
): { front: string; back: string } {
  const frontTemplate = template.frontTemplate;
  const backTemplate = template.backTemplate;

  const front = renderTemplate(frontTemplate, sampleFields, {
    isCloze,
    clozeNumber: isCloze ? clozeNumber : undefined,
    showAnswer: false,
  });

  const back = renderTemplate(backTemplate, sampleFields, {
    isCloze,
    clozeNumber: isCloze ? clozeNumber : undefined,
    showAnswer: true,
    frontSide: front,
  });

  return { front, back };
}

/**
 * Wrap rendered content with template CSS
 */
export function wrapWithCSS(html: string, css: string): string {
  return `
    <style>${css}</style>
    <div class="card">${html}</div>
  `;
}
