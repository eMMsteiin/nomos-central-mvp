import { useState, useEffect, useCallback } from "react";
import { ExternalLink, AlertCircle, Loader2 } from "lucide-react";
import { ExternalTool } from "@/types/externalTool";
import { ToolIcon } from "./ToolIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ExternalToolViewProps {
  tool: ExternalTool;
  onOpenPopout: (tool: ExternalTool) => void;
}

// Sites conhecidos que bloqueiam iframes
const BLOCKED_SITES = [
  'canva.com',
  'figma.com',
  'docs.google.com',
  'sheets.google.com',
  'slides.google.com',
  'drive.google.com',
  'notion.so',
  'trello.com',
  'miro.com',
  'office.live.com',
  'onedrive.live.com',
  'microsoft.com',
  'outlook.com',
  'deepl.com',
];

function isKnownBlockedSite(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return BLOCKED_SITES.some(blocked => hostname.includes(blocked));
  } catch {
    return false;
  }
}

export function ExternalToolView({ tool, onOpenPopout }: ExternalToolViewProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'blocked'>('loading');
  const isKnownBlocked = isKnownBlockedSite(tool.url);

  // Se é um site conhecido que bloqueia, mostrar fallback direto
  useEffect(() => {
    if (isKnownBlocked) {
      setLoadState('blocked');
    } else {
      setLoadState('loading');
    }
  }, [tool.id, isKnownBlocked]);

  const handleIframeLoad = useCallback(() => {
    // Iframe carregou, mas pode ter sido bloqueado silenciosamente
    // Infelizmente não conseguimos detectar X-Frame-Options via JS
    setLoadState('loaded');
  }, []);

  const handleIframeError = useCallback(() => {
    setLoadState('blocked');
  }, []);

  // Fallback UI para sites bloqueados
  if (loadState === 'blocked') {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/20">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <ToolIcon icon={tool.icon} color={tool.iconColor} size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{tool.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                  <AlertCircle className="h-4 w-4" />
                  Este site não permite visualização embutida
                </p>
              </div>

              <p className="text-xs text-muted-foreground max-w-xs">
                Por motivos de segurança, {tool.name} não pode ser exibido dentro da NOMOS. 
                Você pode abrir em uma janela ao lado para continuar trabalhando.
              </p>

              <Button 
                onClick={() => onOpenPopout(tool)}
                className="gap-2 mt-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir em janela ao lado
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-background">
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando {tool.name}...</p>
          </div>
        </div>
      )}
      
      <iframe
        src={tool.url}
        className="w-full h-full border-0"
        title={tool.name}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
