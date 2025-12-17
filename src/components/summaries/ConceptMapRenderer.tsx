import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Circle, ArrowRight, Lightbulb, Link2 } from 'lucide-react';

interface ConceptMapRendererProps {
  content: string;
  className?: string;
}

interface ConceptNode {
  id: string;
  label: string;
  type: 'central' | 'branch' | 'sub' | 'example' | 'connection';
  children?: ConceptNode[];
  description?: string;
}

function parseConceptMap(content: string): { nodes: ConceptNode[]; rawContent: string } {
  const nodes: ConceptNode[] = [];
  
  // Find central concept
  const centralMatch = content.match(/##\s*🎯?\s*Conceito Central\s*\n+\*?\*?([^\n*]+)/i) ||
                       content.match(/\*\*([^*]+)\*\*/) ||
                       content.match(/^#\s*(.+)$/m);
  
  if (centralMatch) {
    nodes.push({
      id: 'central',
      label: centralMatch[1].replace(/[*#]/g, '').trim(),
      type: 'central',
    });
  }

  // Find branches (### headers)
  const branchRegex = /###\s*(?:Ramo\s*\d+:?\s*)?(.+)/g;
  let branchMatch;
  let branchIndex = 0;
  
  while ((branchMatch = branchRegex.exec(content)) !== null) {
    const branchLabel = branchMatch[1].replace(/[*#[\]]/g, '').trim();
    if (branchLabel && !branchLabel.toLowerCase().includes('conexõ') && !branchLabel.toLowerCase().includes('exemplo')) {
      nodes.push({
        id: `branch-${branchIndex}`,
        label: branchLabel,
        type: 'branch',
      });
      branchIndex++;
    }
  }

  // Find connections section
  const connectionsMatch = content.match(/##\s*🔗?\s*Conexões[^\n]*\n([\s\S]*?)(?=##|$)/i);
  if (connectionsMatch) {
    const connectionLines = connectionsMatch[1].match(/[-•]\s*([^\n]+)/g) || [];
    connectionLines.forEach((line, i) => {
      nodes.push({
        id: `connection-${i}`,
        label: line.replace(/^[-•]\s*/, '').trim(),
        type: 'connection',
      });
    });
  }

  // Find examples section
  const examplesMatch = content.match(/##\s*💡?\s*Exemplos[^\n]*\n([\s\S]*?)(?=##|$)/i);
  if (examplesMatch) {
    const exampleLines = examplesMatch[1].match(/\d+\.\s*([^\n]+)/g) || 
                         examplesMatch[1].match(/[-•]\s*([^\n]+)/g) || [];
    exampleLines.forEach((line, i) => {
      nodes.push({
        id: `example-${i}`,
        label: line.replace(/^\d+\.\s*|^[-•]\s*/, '').trim(),
        type: 'example',
      });
    });
  }

  return { nodes, rawContent: content };
}

const NodeCard = ({ node }: { node: ConceptNode }) => {
  const styles = {
    central: 'bg-primary text-primary-foreground border-primary shadow-lg scale-110',
    branch: 'bg-secondary text-secondary-foreground border-secondary/50',
    sub: 'bg-muted text-muted-foreground border-muted',
    connection: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    example: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  };

  const icons = {
    central: <Circle className="h-3 w-3 fill-current" />,
    branch: <ArrowRight className="h-3 w-3" />,
    sub: <ArrowRight className="h-3 w-3" />,
    connection: <Link2 className="h-3 w-3" />,
    example: <Lightbulb className="h-3 w-3" />,
  };

  return (
    <div className={cn(
      "px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:shadow-md",
      styles[node.type]
    )}>
      <div className="flex items-center gap-2">
        {icons[node.type]}
        <span>{node.label}</span>
      </div>
    </div>
  );
};

export const ConceptMapRenderer = ({ content, className }: ConceptMapRendererProps) => {
  const { nodes, rawContent } = parseConceptMap(content);
  
  const centralNode = nodes.find(n => n.type === 'central');
  const branches = nodes.filter(n => n.type === 'branch');
  const connections = nodes.filter(n => n.type === 'connection');
  const examples = nodes.filter(n => n.type === 'example');

  // If we couldn't parse meaningful nodes, fall back to markdown
  if (nodes.length < 2) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
          <p className="text-sm text-muted-foreground">
            🗺️ Mapa Conceitual
          </p>
        </div>
        <MarkdownRenderer content={rawContent} />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Central Concept */}
      {centralNode && (
        <div className="flex justify-center">
          <NodeCard node={centralNode} />
        </div>
      )}

      {/* Branches */}
      {branches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
            <span className="font-medium">Ramos Principais</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {branches.map(node => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Connections */}
      {connections.length > 0 && (
        <div className="space-y-3 p-4 bg-blue-500/5 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
            <Link2 className="h-4 w-4" />
            <span className="font-medium">🔗 Conexões Importantes</span>
          </div>
          <div className="space-y-2">
            {connections.map(node => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Examples */}
      {examples.length > 0 && (
        <div className="space-y-3 p-4 bg-amber-500/5 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <Lightbulb className="h-4 w-4" />
            <span className="font-medium">💡 Exemplos Práticos</span>
          </div>
          <div className="space-y-2">
            {examples.map(node => (
              <NodeCard key={node.id} node={node} />
            ))}
          </div>
        </div>
      )}

      {/* Full content as reference */}
      <details className="mt-4">
        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
          Ver conteúdo completo
        </summary>
        <div className="mt-3 pt-3 border-t">
          <MarkdownRenderer content={rawContent} />
        </div>
      </details>
    </div>
  );
};
