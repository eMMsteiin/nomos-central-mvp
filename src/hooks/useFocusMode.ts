import { useFocusModeContext } from '@/contexts/FocusModeContext';

export function useFocusMode() {
  const context = useFocusModeContext();
  
  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const formatEndTime = (): string | null => {
    if (!context.state.until) return null;
    
    return new Date(context.state.until).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const remainingFormatted = formatTimeRemaining(context.remainingMs);
  const endTimeFormatted = formatEndTime();

  return {
    ...context,
    remainingFormatted,
    endTimeFormatted,
  };
}

// Utility to parse and clean domain input
export function parseDomain(input: string): string | null {
  if (!input || !input.trim()) return null;
  
  try {
    // Add protocol if missing
    const url = input.includes('://') ? input : `https://${input}`;
    const parsed = new URL(url);
    // Return hostname without www.
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    // Try to clean up as raw hostname
    const cleaned = input
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .split('?')[0]
      .trim();
    
    // Basic validation - must have at least one dot
    if (cleaned && cleaned.includes('.')) {
      return cleaned;
    }
    return null;
  }
}
