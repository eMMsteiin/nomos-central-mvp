import { Task } from '@/types/task';
import { parseISO, isToday, isTomorrow, addDays, parse, isValid, startOfDay, isBefore, isAfter, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateExtractionResult {
  cleanText: string;
  detectedDate?: Date;
  category: 'entrada' | 'hoje' | 'em-breve';
}

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

export function extractDateFromText(text: string): DateExtractionResult {
  const lowerText = text.toLowerCase();
  let detectedDate: Date | undefined;
  let cleanText = text;

  // Detectar "hoje"
  if (/\bhoje\b/i.test(lowerText)) {
    detectedDate = new Date();
    cleanText = text.replace(/\bhoje\b/gi, '').trim();
  }
  
  // Detectar "amanhã"
  else if (/\bamanhã\b/i.test(lowerText)) {
    detectedDate = addDays(new Date(), 1);
    cleanText = text.replace(/\bamanhã\b/gi, '').trim();
  }
  
  // Detectar "depois de amanhã"
  else if (/\bdepois de amanhã\b/i.test(lowerText)) {
    detectedDate = addDays(new Date(), 2);
    cleanText = text.replace(/\bdepois de amanhã\b/gi, '').trim();
  }
  
  // Detectar formato DD/MM ou DD/MM/YYYY
  else {
    const datePatternSlash = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
    const matchSlash = text.match(datePatternSlash);
    
    if (matchSlash) {
      const day = parseInt(matchSlash[1]);
      const month = parseInt(matchSlash[2]) - 1; // months are 0-indexed
      const year = matchSlash[3] 
        ? (matchSlash[3].length === 2 ? 2000 + parseInt(matchSlash[3]) : parseInt(matchSlash[3]))
        : new Date().getFullYear();
      
      const parsedDate = new Date(year, month, day);
      if (isValid(parsedDate)) {
        detectedDate = parsedDate;
        cleanText = text.replace(datePatternSlash, '').trim();
      }
    }
  }
  
  // Detectar formato "DD de MÊS" ou "DD de MÊS de YYYY"
  if (!detectedDate) {
    const monthPattern = MONTHS_PT.join('|');
    const datePatternMonth = new RegExp(
      `\\b(\\d{1,2})\\s+de\\s+(${monthPattern})(?:\\s+de\\s+(\\d{4}))?\\b`,
      'i'
    );
    const matchMonth = lowerText.match(datePatternMonth);
    
    if (matchMonth) {
      const day = parseInt(matchMonth[1]);
      const monthName = matchMonth[2].toLowerCase();
      const monthIndex = MONTHS_PT.indexOf(monthName);
      const year = matchMonth[3] ? parseInt(matchMonth[3]) : new Date().getFullYear();
      
      if (monthIndex !== -1) {
        const parsedDate = new Date(year, monthIndex, day);
        if (isValid(parsedDate)) {
          detectedDate = parsedDate;
          cleanText = text.replace(datePatternMonth, '').trim();
        }
      }
    }
  }
  
  // Determinar categoria baseada na data detectada
  const category = categorizeByDetectedDate(detectedDate);
  
  // Limpar espaços extras
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  return {
    cleanText,
    detectedDate,
    category
  };
}

function categorizeByDetectedDate(date?: Date): 'entrada' | 'hoje' | 'em-breve' {
  if (!date) return 'entrada';
  
  const today = startOfDay(new Date());
  const dateStart = startOfDay(date);
  
  // Se a data já passou, vai para entrada
  if (isBefore(dateStart, today)) {
    return 'entrada';
  }
  
  // Se é hoje
  if (isToday(date)) {
    return 'hoje';
  }
  
  // Se é amanhã ou nos próximos 7 dias
  const sevenDaysFromNow = addDays(today, 7);
  if (isBefore(dateStart, sevenDaysFromNow) || dateStart.getTime() === sevenDaysFromNow.getTime()) {
    return 'em-breve';
  }
  
  // Mais de 7 dias no futuro
  return 'entrada';
}

export function formatDetectedDate(date: Date): string {
  const today = startOfDay(new Date());
  const dateStart = startOfDay(date);

  const tomorrow = addDays(today, 1);
  const dayAfterTomorrow = addDays(today, 2);

  if (dateStart.getTime() === today.getTime()) {
    return 'Hoje';
  }

  if (dateStart.getTime() === tomorrow.getTime()) {
    return 'Amanhã';
  }

  if (dateStart.getTime() === dayAfterTomorrow.getTime()) {
    return 'Depois de amanhã';
  }
  
  // Formato padrão: "22 de novembro"
  return date.toLocaleDateString('pt-BR', { 
    day: 'numeric', 
    month: 'long' 
  });
}
