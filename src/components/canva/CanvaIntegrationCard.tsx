import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCanvaSession } from '@/contexts/CanvaSessionContext';
import { Palette, Timer, Link2, ExternalLink } from 'lucide-react';

export function CanvaIntegrationCard() {
  const { settings, updateSettings } = useCanvaSession();

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Palette className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Canva – Pop-out Inteligente</CardTitle>
            <CardDescription>
              Crie designs enquanto mantém o foco nas suas tarefas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* How it works */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <h4 className="font-medium text-sm">Como funciona:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ExternalLink className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>O Canva abre em uma janela separada ao lado da NOMOS</span>
            </li>
            <li className="flex items-start gap-2">
              <Timer className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Um timer de foco registra quanto tempo você trabalha em cada design</span>
            </li>
            <li className="flex items-start gap-2">
              <Link2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <span>Você pode vincular a URL do design à tarefa para retomar depois</span>
            </li>
          </ul>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Configurações</h4>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="canva-enabled" className="flex flex-col gap-1">
              <span>Ativar integração</span>
              <span className="text-xs text-muted-foreground font-normal">
                Mostrar botão "Abrir no Canva" nas tarefas
              </span>
            </Label>
            <Switch
              id="canva-enabled"
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="focus-sidebar" className="flex flex-col gap-1">
              <span>Barra de foco</span>
              <span className="text-xs text-muted-foreground font-normal">
                Exibir timer e controles durante sessão
              </span>
            </Label>
            <Switch
              id="focus-sidebar"
              checked={settings.showFocusSidebar}
              onCheckedChange={(showFocusSidebar) => updateSettings({ showFocusSidebar })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-detect" className="flex flex-col gap-1">
              <span>Detecção automática</span>
              <span className="text-xs text-muted-foreground font-normal">
                Sugerir Canva para tarefas de design
              </span>
            </Label>
            <Switch
              id="auto-detect"
              checked={settings.autoDetectCanvaTasks}
              onCheckedChange={(autoDetectCanvaTasks) => updateSettings({ autoDetectCanvaTasks })}
            />
          </div>
        </div>

        {/* Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">
              Integração ativa – nenhuma conta necessária
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
