interface TimeExtractionResult {
  cleanText: string;
  time?: string;
}

export function extractTimeFromText(text: string): TimeExtractionResult {
  const timeRegex = /\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\b/g;
  const matches = text.match(timeRegex);
  
  if (!matches) return { cleanText: text };
  
  const rawTime = matches[0];
  const [hours, minutes] = rawTime.split(':').map(Number);
  
  let period = 'AM';
  let displayHours = hours;
  
  if (hours === 0) {
    displayHours = 12;
  } else if (hours === 12) {
    period = 'PM';
  } else if (hours > 12) {
    displayHours = hours - 12;
    period = 'PM';
  }
  
  const formattedTime = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  const cleanText = text.replace(timeRegex, '').trim();
  
  return { cleanText, time: formattedTime };
}

export function formatDateToTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  let period = 'AM';
  let displayHours = hours;
  
  if (hours === 0) {
    displayHours = 12;
  } else if (hours === 12) {
    period = 'PM';
  } else if (hours > 12) {
    displayHours = hours - 12;
    period = 'PM';
  }
  
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}
