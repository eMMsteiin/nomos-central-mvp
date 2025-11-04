import ICAL from 'ical.js';
import { supabase } from '@/integrations/supabase/client';

export interface ICSEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
}

export async function fetchAndParseICS(url: string): Promise<ICSEvent[]> {
  // Chamar Edge Function para evitar problemas de CORS
  const { data, error } = await supabase.functions.invoke('fetch-ics', {
    body: { url }
  });
  
  if (error) {
    console.error('Erro na Edge Function:', error);
    throw new Error('Erro ao buscar calendário');
  }
  
  if (!data?.icsText) {
    throw new Error('Calendário vazio ou inválido');
  }
  
  const icsText = data.icsText;
  
  const jcalData = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents('vevent');
  
  const events = vevents.map(vevent => {
    const event = new ICAL.Event(vevent);
    return {
      id: event.uid,
      title: event.summary,
      description: event.description || '',
      start: event.startDate.toJSDate(),
      end: event.endDate.toJSDate(),
      location: event.location,
    };
  });
  
  const now = new Date();
  return events.filter(e => e.end >= now);
}

export function categorizeByDate(eventDate: Date): 'hoje' | 'em-breve' | 'futuras' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'hoje';
  if (diffDays > 0 && diffDays <= 7) return 'em-breve';
  return 'futuras';
}
