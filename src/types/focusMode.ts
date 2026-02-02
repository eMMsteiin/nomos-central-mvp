export interface FocusState {
  active: boolean;
  startedAt: number | null;
  until: number | null;
  durationMin: number | null;
  blocklist: string[];
  allowlist: string[];
  lastEndReason: 'completed' | 'ended_early' | null;
}

export const FOCUS_STORAGE_KEY = 'nomos_focus_state';

export const DEFAULT_FOCUS_STATE: FocusState = {
  active: false,
  startedAt: null,
  until: null,
  durationMin: null,
  blocklist: [],
  allowlist: [],
  lastEndReason: null,
};

export const DEFAULT_BLOCKLIST = [
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'x.com',
  'twitter.com',
  'facebook.com',
  'reddit.com',
];

export const DEFAULT_ALLOWLIST = [
  'docs.google.com',
  'calendar.google.com',
  'web.whatsapp.com',
];

export const DURATION_PRESETS = [25, 50, 90] as const;

export type FocusEventType = 
  | 'NOMOS_FOCUS_START' 
  | 'NOMOS_FOCUS_STOP' 
  | 'NOMOS_FOCUS_UPDATE';

export interface FocusEvent {
  source: 'NOMOS';
  type: FocusEventType;
  payload: Partial<FocusState> & { reason?: 'completed' | 'ended_early' };
}
