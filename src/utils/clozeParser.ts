// ============================================================================
// BLOCO 3: Cloze Deletion Parser
// Parses Anki-style cloze syntax: {{c1::text}} or {{c1::text::hint}}
// ============================================================================

export interface ClozeOccurrence {
  number: number;
  text: string;
  hint?: string;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedCloze {
  occurrences: ClozeOccurrence[];
  uniqueNumbers: number[];
  hasValidCloze: boolean;
}

// Regex to match cloze deletions: {{c1::text}} or {{c1::text::hint}}
const CLOZE_REGEX = /\{\{c(\d+)::([^}:]+)(?:::([^}]+))?\}\}/g;

/**
 * Parse all cloze deletions from a text
 */
export function parseClozeText(text: string): ParsedCloze {
  const occurrences: ClozeOccurrence[] = [];
  let match;

  // Reset regex state
  CLOZE_REGEX.lastIndex = 0;

  while ((match = CLOZE_REGEX.exec(text)) !== null) {
    occurrences.push({
      number: parseInt(match[1], 10),
      text: match[2],
      hint: match[3],
      fullMatch: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  // Get unique cloze numbers (each becomes a card)
  const uniqueNumbers = [...new Set(occurrences.map(o => o.number))].sort((a, b) => a - b);

  return {
    occurrences,
    uniqueNumbers,
    hasValidCloze: occurrences.length > 0,
  };
}

/**
 * Render text for a specific cloze card number
 * - Shows [...] or [hint] for the target cloze number
 * - Shows revealed text for other cloze numbers
 */
export function renderClozeForCard(
  text: string,
  cardNumber: number,
  showAnswer: boolean = false
): string {
  const parsed = parseClozeText(text);
  let result = text;

  // Process in reverse order to maintain correct indices
  const sortedOccurrences = [...parsed.occurrences].sort(
    (a, b) => b.startIndex - a.startIndex
  );

  for (const occurrence of sortedOccurrences) {
    let replacement: string;

    if (occurrence.number === cardNumber) {
      if (showAnswer) {
        // Show the answer with styling
        replacement = `<span class="cloze">${occurrence.text}</span>`;
      } else {
        // Show blank or hint
        const hint = occurrence.hint || '...';
        replacement = `<span class="cloze-blank">[${hint}]</span>`;
      }
    } else {
      // Other cloze numbers - show text normally (Anki behavior)
      replacement = occurrence.text;
    }

    result =
      result.substring(0, occurrence.startIndex) +
      replacement +
      result.substring(occurrence.endIndex);
  }

  return result;
}

/**
 * Get the front of a cloze card (with blanks)
 */
export function getClozeFront(text: string, cardNumber: number): string {
  return renderClozeForCard(text, cardNumber, false);
}

/**
 * Get the back of a cloze card (with answers revealed)
 */
export function getClozeBack(text: string, cardNumber: number): string {
  return renderClozeForCard(text, cardNumber, true);
}

/**
 * Count how many cards a cloze note will generate
 */
export function countClozeCards(text: string): number {
  const parsed = parseClozeText(text);
  return parsed.uniqueNumbers.length;
}

/**
 * Auto-number clozes if they don't have numbers
 * Converts {{::text}} to {{c1::text}}, {{c2::text}}, etc.
 */
export function autoNumberClozes(text: string): string {
  // Match clozes without numbers: {{::text}}
  const unnumberedRegex = /\{\{::([^}]+)\}\}/g;
  let counter = 1;
  
  // First, find existing max cloze number
  const parsed = parseClozeText(text);
  const maxExisting = Math.max(0, ...parsed.uniqueNumbers);
  counter = maxExisting + 1;

  return text.replace(unnumberedRegex, (_, content) => {
    return `{{c${counter++}::${content}}}`;
  });
}

/**
 * Validate cloze syntax
 * Returns errors if the syntax is invalid
 */
export function validateClozeText(text: string): string[] {
  const errors: string[] = [];
  const parsed = parseClozeText(text);

  if (!parsed.hasValidCloze) {
    errors.push('No valid cloze deletions found. Use {{c1::text}} syntax.');
  }

  // Check for gaps in numbering (warning, not error)
  const numbers = parsed.uniqueNumbers;
  for (let i = 0; i < numbers.length; i++) {
    if (numbers[i] !== i + 1) {
      // Not an error in Anki, but worth noting
      break;
    }
  }

  // Check for empty cloze content
  for (const occ of parsed.occurrences) {
    if (!occ.text.trim()) {
      errors.push(`Empty cloze content at position ${occ.startIndex + 1}`);
    }
  }

  return errors;
}

/**
 * Insert a cloze at a specific position in text
 */
export function insertCloze(
  text: string,
  start: number,
  end: number,
  clozeNumber?: number
): string {
  const selectedText = text.substring(start, end);
  const parsed = parseClozeText(text);
  const nextNumber = clozeNumber ?? Math.max(0, ...parsed.uniqueNumbers, 0) + 1;

  return (
    text.substring(0, start) +
    `{{c${nextNumber}::${selectedText}}}` +
    text.substring(end)
  );
}

/**
 * Remove cloze formatting and return plain text
 */
export function stripClozeFormatting(text: string): string {
  return text.replace(CLOZE_REGEX, '$2');
}
