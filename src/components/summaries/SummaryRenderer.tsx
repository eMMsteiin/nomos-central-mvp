import { SummaryTemplate } from '@/types/summary';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CornellLayout } from './CornellLayout';
import { ConceptMapRenderer } from './ConceptMapRenderer';
import { cn } from '@/lib/utils';

interface SummaryRendererProps {
  content: string;
  template: SummaryTemplate;
  className?: string;
}

export const SummaryRenderer = ({ content, template, className }: SummaryRendererProps) => {
  switch (template) {
    case 'cornell':
      return <CornellLayout content={content} className={className} />;
    case 'conceptual':
      return <ConceptMapRenderer content={content} className={className} />;
    case 'topics':
    default:
      return <MarkdownRenderer content={content} className={className} />;
  }
};
