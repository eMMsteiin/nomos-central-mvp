import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeTemplate } from '@/themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Miniatura do app desenhada com os componentes reais e com o data-theme do
 * próprio template — por isso mostra o visual do template mesmo que outro
 * esteja ativo no momento.
 */
function TemplatePreview({ template }: { template: ThemeTemplate }) {
  return (
    <div
      data-theme={template.id}
      aria-hidden="true"
      className="flex h-44 overflow-hidden rounded-lg border border-border text-foreground"
      style={{
        backgroundColor: 'hsl(var(--background))',
        backgroundImage: 'var(--page-backdrop, none)',
      }}
    >
      {/* Sidebar */}
      <div
        className="flex w-[30%] flex-col gap-1.5 overflow-hidden border-r border-sidebar-border p-2.5"
        style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}
      >
        <div className="mb-1 h-2 w-8 rounded-full bg-muted-foreground/40" />
        <div className="truncate rounded-md bg-sidebar-accent px-1.5 py-1 text-[9px] font-semibold text-sidebar-accent-foreground">
          Hoje
        </div>
        <div className="truncate px-1.5 py-1 text-[9px] text-muted-foreground">Em breve</div>
        <div className="truncate px-1.5 py-1 text-[9px] text-muted-foreground">Caderno</div>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="text-xs font-semibold tracking-tight">Hoje</div>
        <Card className="flex flex-col gap-1.5 p-2.5">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="h-3 w-3 rounded-full border border-muted-foreground/50" />
            Revisar flashcards
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-2 w-2" />
            </span>
            Resumo de cálculo
          </div>
        </Card>
        <div className="mt-auto flex gap-2">
          <Button size="sm" className="h-6 px-3 text-[10px]">Nova tarefa</Button>
          <Button size="sm" variant="outline" className="h-6 px-3 text-[10px]">Importar</Button>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  active,
  onApply,
}: {
  template: ThemeTemplate;
  active: boolean;
  onApply: () => void;
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template.css);
      toast.success(`CSS do template ${template.name} copiado`);
    } catch {
      toast.error('Não foi possível copiar o CSS');
    }
  };

  return (
    <Card
      className={cn(
        'flex flex-col gap-4 p-4',
        active && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
      )}
    >
      <TemplatePreview template={template} />

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{template.name}</h3>
          {active && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              Em uso
            </span>
          )}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{template.tagline}</p>
        <p className="text-xs text-muted-foreground">{template.description}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {template.swatches.map((color) => (
          <span
            key={color}
            className="h-5 w-5 rounded-full border border-border"
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {template.traits.map((trait) => (
          <span key={trait} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {trait}
          </span>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={onApply} disabled={active} className="min-w-[9rem] flex-1">
          {active ? 'Template em uso' : 'Aplicar template'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleCopy} title="Copiar o código CSS do template">
          <Copy className="h-3.5 w-3.5" />
          Copiar CSS
        </Button>
      </div>
    </Card>
  );
}

export default function TemplatesPanel() {
  const { theme, themes, setTheme } = useTheme();

  const handleApply = (template: ThemeTemplate) => {
    setTheme(template.id);
    toast.success(`Template ${template.name} aplicado`);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-base font-medium text-foreground mb-2">Templates</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o visual da plataforma. Os templates ficam guardados aqui exatamente como foram
          criados, então você pode trocar quando quiser. A escolha é salva neste navegador.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {themes.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            active={template.id === theme.id}
            onApply={() => handleApply(template)}
          />
        ))}
      </div>
    </div>
  );
}
