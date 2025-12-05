import { CanvaIntegrationCard } from '@/components/canva/CanvaIntegrationCard';

export default function ConfiguracoesIntegracoes() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        <p className="text-muted-foreground mt-1">
          Conecte ferramentas externas para potencializar seu fluxo de trabalho
        </p>
      </div>

      <div className="space-y-4">
        <CanvaIntegrationCard />
        
        {/* Placeholder for future integrations */}
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Mais integrações em breve...
          </p>
        </div>
      </div>
    </div>
  );
}
