import { useCanvaSession } from '@/contexts/CanvaSessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Play, Pause, Check, ExternalLink, Link2, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function FocusSidebar() {
  const {
    session,
    endSession,
    pauseSession,
    resumeSession,
    linkDesign,
    bringCanvaToFront,
    isPopoutOpen,
  } = useCanvaSession();
  
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  if (!session) return null;

  const handleComplete = () => {
    endSession(true);
    toast({
      title: "Sessão concluída!",
      description: `Tempo total: ${formatTime(session.elapsedSeconds)}`,
    });
  };

  const handleCancel = () => {
    endSession(false);
    toast({
      title: "Sessão encerrada",
      description: "Seu progresso foi salvo.",
    });
  };

  const handleLinkDesign = () => {
    if (linkUrl.includes('canva.com')) {
      linkDesign(linkUrl);
      setLinkUrl('');
      setShowLinkInput(false);
      toast({
        title: "Design vinculado!",
        description: "URL do Canva salva na tarefa.",
      });
    } else {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL do Canva.",
        variant: "destructive",
      });
    }
  };

  // Mobile: bottom sheet style
  if (isMobile) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50 transition-all duration-300 ${isExpanded ? 'h-[70vh]' : 'h-auto'}`}>
        {/* Collapsed bar */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-lg font-mono font-bold text-primary">
              {formatTime(session.elapsedSeconds)}
            </div>
            <span className="text-sm truncate text-muted-foreground">{session.taskText}</span>
          </div>
          <div className="flex items-center gap-2">
            {session.isActive ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); pauseSession(); }}>
                <Pause className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); resumeSession(); }}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); handleComplete(); }}>
              <Check className="h-4 w-4" />
            </Button>
            <ChevronUp className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="flex flex-col p-4 border-t border-border overflow-auto" style={{ maxHeight: 'calc(70vh - 60px)' }}>
            {/* Design Link */}
            <div className="mb-4">
              {session.designUrl ? (
                <a
                  href={session.designUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Link2 className="h-3 w-3" />
                  {session.designTitle || 'Abrir design'}
                </a>
              ) : showLinkInput ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Cole a URL do Canva..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleLinkDesign} className="flex-1">Vincular</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => setShowLinkInput(true)}>
                  <Link2 className="h-3 w-3" />
                  Vincular design
                </Button>
              )}
            </div>

            {isPopoutOpen && (
              <Button variant="secondary" size="sm" className="w-full gap-1 mb-4" onClick={bringCanvaToFront}>
                <ExternalLink className="h-3 w-3" />
                Trazer Canva
              </Button>
            )}

            <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleCancel}>
              Encerrar sessão
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Desktop: right sidebar
  return (
    <div className="fixed right-0 top-0 h-full w-64 bg-card border-l border-border shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-primary/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Modo Foco
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="font-semibold text-foreground line-clamp-2">
          {session.taskText}
        </h3>
      </div>

      {/* Timer */}
      <div className="p-6 text-center border-b border-border">
        <div className="text-4xl font-mono font-bold text-primary mb-2">
          {formatTime(session.elapsedSeconds)}
        </div>
        <div className="flex justify-center gap-2">
          {session.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={pauseSession}
              className="gap-1"
            >
              <Pause className="h-3 w-3" />
              Pausar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={resumeSession}
              className="gap-1"
            >
              <Play className="h-3 w-3" />
              Retomar
            </Button>
          )}
        </div>
      </div>

      {/* Design Link Section */}
      <div className="p-4 border-b border-border">
        {session.designUrl ? (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Design vinculado:</span>
            <a
              href={session.designUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
            >
              <Link2 className="h-3 w-3 flex-shrink-0" />
              {session.designTitle || 'Abrir design'}
            </a>
          </div>
        ) : showLinkInput ? (
          <div className="space-y-2">
            <Input
              placeholder="Cole a URL do Canva..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleLinkDesign} className="flex-1">
                Vincular
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowLinkInput(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={() => setShowLinkInput(true)}
          >
            <Link2 className="h-3 w-3" />
            Vincular design
          </Button>
        )}
      </div>

      {/* Canva Control */}
      {isPopoutOpen && (
        <div className="p-4 border-b border-border">
          <Button
            variant="secondary"
            size="sm"
            className="w-full gap-1"
            onClick={bringCanvaToFront}
          >
            <ExternalLink className="h-3 w-3" />
            Trazer Canva
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto p-4 space-y-2">
        <Button
          className="w-full gap-1"
          onClick={handleComplete}
        >
          <Check className="h-4 w-4" />
          Concluir tarefa
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleCancel}
        >
          Encerrar sessão
        </Button>
      </div>
    </div>
  );
}
