interface TimeExtractionResult {
  cleanText: string;
  time?: string;
}

export function extractTimeFromText(text: string): TimeExtractionResult {
  // Formato padrão: HH:MM
  const timeRegexColon = /\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/g;
  
  // Formato alternativo: 14h, 14h30
  const timeRegexH = /\b([0-1]?[0-9]|2[0-3])h([0-5][0-9])?\b/gi;
  
  let matches = text.match(timeRegexColon);
  let usedRegex: RegExp = timeRegexColon;
  
  if (!matches) {
    matches = text.match(timeRegexH);
    usedRegex = timeRegexH;
  }
  
  if (!matches) return { cleanText: text };
  
  const rawTime = matches[0];
  let hours: number;
  let minutes: number;
  
  if (rawTime.includes(':')) {
    [hours, minutes] = rawTime.split(':').map(Number);
  } else {
    // Formato "14h" ou "14h30"
    const match = rawTime.match(/(\d{1,2})h(\d{2})?/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = match[2] ? parseInt(match[2], 10) : 0;
    } else {
      return { cleanText: text };
    }
  }
  
  // Manter formato 24h brasileiro
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const cleanText = text.replace(usedRegex, '').trim();
  
  return { cleanText, time: formattedTime };
}

export function formatDateToTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Manter formato 24h brasileiro
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
