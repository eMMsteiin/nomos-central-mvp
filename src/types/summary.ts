export type SummaryType = 'essential' | 'exam';
export type SummarySourceType = 'notebook' | 'study_block' | 'manual' | 'chat';

export interface Summary {
  id: string;
  title: string;
  subject: string;
  type: SummaryType;
  content: string;
  createdAt: string;
  updatedAt: string;
  sourceType?: SummarySourceType;
  sourceId?: string;
  emoji?: string;
  color?: string;
}

export interface SummaryGroup {
  subject: string;
  summaries: Summary[];
  color: string;
  emoji: string;
}
