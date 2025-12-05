export interface CanvaSession {
  taskId: string;
  taskText: string;
  designUrl?: string;
  designTitle?: string;
  startedAt: string;
  elapsedSeconds: number;
  isActive: boolean;
  popoutWindow?: Window | null;
}

export interface CanvaSessionHistory {
  taskId: string;
  taskText: string;
  designUrl?: string;
  totalTimeSpent: number;
  sessions: {
    startedAt: string;
    endedAt: string;
    duration: number;
  }[];
}

export interface CanvaIntegrationSettings {
  enabled: boolean;
  showFocusSidebar: boolean;
  autoDetectCanvaTasks: boolean;
}

export const DEFAULT_CANVA_SETTINGS: CanvaIntegrationSettings = {
  enabled: true,
  showFocusSidebar: true,
  autoDetectCanvaTasks: true,
};

// Keywords that suggest a task might benefit from Canva
export const CANVA_TASK_KEYWORDS = [
  'slide', 'slides', 'apresentação', 'apresentacao', 
  'poster', 'pôster', 'banner', 'flyer',
  'infográfico', 'infografico', 'design',
  'canva', 'cartaz', 'convite', 'card',
  'thumbnail', 'capa', 'cover', 'layout'
];

export function isCanvaRelatedTask(taskText: string): boolean {
  const lowerText = taskText.toLowerCase();
  return CANVA_TASK_KEYWORDS.some(keyword => lowerText.includes(keyword));
}
