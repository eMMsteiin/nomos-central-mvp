import { useState } from 'react';
import { useFocusMode } from '@/hooks/useFocusMode';
import { DEFAULT_BLOCKLIST, DEFAULT_ALLOWLIST } from '@/types/focusMode';
import { DomainListEditor } from '@/components/focus/DomainListEditor';
import { AppIconPicker } from '@/components/focus/AppIconPicker';
import { FocusDurationSelector } from '@/components/focus/FocusDurationSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, ChevronDown, Play, Square } from 'lucide-react';
import { toast } from 'sonner';

export default function FocusSettingsPanel() {
  const { 
    state, 
    remainingFormatted, 
    endTimeFormatted,
    startSession, 
    endSession,
    updateBlocklist,
    updateAllowlist,
  } = useFocusMode();

  const [selectedDuration, setSelectedDuration] = useState<number | null>(
    state.durationMin || 25
  );
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleStartSession = () => {
    if (!selectedDuration || selectedDuration <= 0) {
      toast.error('Selecione uma duração');
      return;
    }

    if (state.blocklist.length === 0) {
      setShowSuggestDialog(true);
      return;
    }

    startSession(selectedDuration);
  };

  const handleStartWithDefaults = () => {
    updateBlocklist(DEFAULT_BLOCKLIST);
    if (state.allowlist.length === 0) {
      updateAllowlist(DEFAULT_ALLOWLIST);
    }
    setShowSuggestDialog(false);
    
    setTimeout(() => {
      if (selectedDuration) {
        startSession(selectedDuration);
      }
    }, 100);
  };

  const handleStartWithoutDefaults = () => {
    setShowSuggestDialog(false);
    if (selectedDuration) {
      startSession(selectedDuration);
    }
  };

  const handleEndSession = () => {
    setShowEndDialog(false);
    endSession('ended_early');
  };

  return (
    <div className="p-6 max-w-xl space-y-6">
      {/* Header - Minimal */}
      <div>
        <h1 className="text-base font-medium">Modo Foco</h1>
        <p className="text-sm text-muted-foreground">
          Proteja seu tempo de estudo
        </p>
      </div>

      {/* Status - Minimal */}
      <Card className={state.active ? 'border-foreground' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              {state.active ? 'Ativo' : 'Inativo'}
            </CardTitle>
            <Switch 
              checked={state.active} 
              onCheckedChange={(checked) => {
                if (checked) {
                  handleStartSession();
                } else {
                  setShowEndDialog(true);
                }
              }}
            />
          </div>
        </CardHeader>
        
        {state.active && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 text-base">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-medium text-lg">
                {remainingFormatted}
              </span>
              {endTimeFormatted && (
                <span className="text-muted-foreground text-sm">
                  até {endTimeFormatted}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {state.durationMin} minutos
            </p>
          </CardContent>
        )}
      </Card>

      {/* Duration Selector - Minimal */}
      {!state.active && (
        <Card>
          <CardContent className="pt-4">
            <FocusDurationSelector
              selectedDuration={selectedDuration}
              onSelect={setSelectedDuration}
              disabled={state.active}
            />
          </CardContent>
        </Card>
      )}

      {/* Blocklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sites para bloquear</CardTitle>
          <CardDescription className="text-xs">
            Selecione os sites que serão bloqueados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AppIconPicker
            selectedDomains={state.blocklist}
            onChange={updateBlocklist}
            disabled={state.active}
          />
          
          {/* Advanced Mode */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-2 text-xs text-muted-foreground"
              >
                Avançado
                <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="border border-border rounded-sm p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Adicionar manualmente:
                </p>
                <DomainListEditor
                  domains={state.blocklist}
                  onChange={updateBlocklist}
                  placeholder="ex: medium.com"
                  emptyMessage="Nenhum site"
                  disabled={state.active}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Allowlist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Exceções</CardTitle>
          <CardDescription className="text-xs">
            Sites sempre liberados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DomainListEditor
            domains={state.allowlist}
            onChange={updateAllowlist}
            placeholder="ex: docs.google.com"
            emptyMessage="Nenhuma exceção"
            disabled={state.active}
          />
        </CardContent>
      </Card>

      {/* Action Button */}
      {!state.active && (
        <Button 
          onClick={handleStartSession}
          className="w-full gap-2"
          disabled={!selectedDuration}
        >
          <Play className="h-4 w-4" />
          Iniciar foco
        </Button>
      )}

      {state.active && (
        <Button 
          onClick={() => setShowEndDialog(true)}
          variant="outline"
          className="w-full gap-2"
        >
          <Square className="h-4 w-4" />
          Encerrar
        </Button>
      )}

      {/* Info - Minimal */}
      <p className="text-xs text-muted-foreground text-center">
        Bloqueio total será habilitado com extensão futura.
      </p>

      {/* Suggest Defaults Dialog */}
      <AlertDialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-medium">Adicionar sites populares?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Lista vazia. Adicionar Instagram, TikTok, YouTube, X, Facebook, Reddit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartWithoutDefaults} className="text-xs">
              Sem sites
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStartWithDefaults} className="text-xs">
              Adicionar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-medium">Encerrar?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Ainda resta {remainingFormatted}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Continuar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession} className="text-xs">
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
