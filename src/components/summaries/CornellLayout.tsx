import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { FileText, HelpCircle, Pin } from 'lucide-react';

interface CornellLayoutProps {
  content: string;
  className?: string;
}

interface CornellSections {
  notes: string;
  questions: string;
  summary: string;
}

function parseCornellContent(content: string): CornellSections {
  const sections: CornellSections = {
    notes: '',
    questions: '',
    summary: '',
  };

  // Try to find sections by markers
  const notesMarkers = ['## 📝 Notas', '## Notas', '---NOTAS---', '**Notas'];
  const questionsMarkers = ['## ❓ Perguntas', '## Perguntas', '---PERGUNTAS---', '**Perguntas'];
  const summaryMarkers = ['## 📌 Resumo', '## Resumo Final', '---RESUMO---', '**Resumo'];

  let notesStart = -1;
  let questionsStart = -1;
  let summaryStart = -1;

  // Find start positions
  for (const marker of notesMarkers) {
    const idx = content.indexOf(marker);
    if (idx !== -1 && (notesStart === -1 || idx < notesStart)) {
      notesStart = idx;
    }
  }

  for (const marker of questionsMarkers) {
    const idx = content.indexOf(marker);
    if (idx !== -1 && (questionsStart === -1 || idx < questionsStart)) {
      questionsStart = idx;
    }
  }

  for (const marker of summaryMarkers) {
    const idx = content.indexOf(marker);
    if (idx !== -1 && (summaryStart === -1 || idx < summaryStart)) {
      summaryStart = idx;
    }
  }

  // Extract sections based on positions
  const positions = [
    { name: 'notes', start: notesStart },
    { name: 'questions', start: questionsStart },
    { name: 'summary', start: summaryStart },
  ].filter(p => p.start !== -1).sort((a, b) => a.start - b.start);

  if (positions.length === 0) {
    // No markers found, treat entire content as notes
    sections.notes = content;
    return sections;
  }

  for (let i = 0; i < positions.length; i++) {
    const current = positions[i];
    const next = positions[i + 1];
    const endIdx = next ? next.start : content.length;
    
    let sectionContent = content.slice(current.start, endIdx);
    // Remove the header line
    sectionContent = sectionContent.replace(/^.*?\n/, '').trim();
    
    sections[current.name as keyof CornellSections] = sectionContent;
  }

  return sections;
}

export const CornellLayout = ({ content, className }: CornellLayoutProps) => {
  const sections = parseCornellContent(content);

  return (
    <div className={cn("grid gap-4", className)}>
      {/* Main content area - Notes and Questions side by side on desktop */}
      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        {/* Notes - Main area */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-primary/10 border-b">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-primary">📝 Notas Principais</h3>
          </div>
          <div className="p-4">
            {sections.notes ? (
              <MarkdownRenderer content={sections.notes} />
            ) : (
              <p className="text-muted-foreground text-sm italic">Sem notas disponíveis</p>
            )}
          </div>
        </div>

        {/* Questions - Sidebar */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border-b">
            <HelpCircle className="h-4 w-4 text-amber-600" />
            <h3 className="font-semibold text-sm text-amber-700 dark:text-amber-500">❓ Perguntas-Chave</h3>
          </div>
          <div className="p-4">
            {sections.questions ? (
              <MarkdownRenderer content={sections.questions} />
            ) : (
              <p className="text-muted-foreground text-sm italic">Sem perguntas</p>
            )}
          </div>
        </div>
      </div>

      {/* Summary - Footer */}
      <div className="bg-card border rounded-lg overflow-hidden border-primary/30">
        <div className="flex items-center gap-2 p-3 bg-primary/5 border-b border-primary/20">
          <Pin className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-primary">📌 Resumo Final</h3>
        </div>
        <div className="p-4 bg-primary/5">
          {sections.summary ? (
            <MarkdownRenderer content={sections.summary} className="prose-p:text-foreground prose-p:font-medium" />
          ) : (
            <p className="text-muted-foreground text-sm italic">Sem resumo final</p>
          )}
        </div>
      </div>
    </div>
  );
};
