import { useState } from 'react';
import { useFocusMode } from '@/hooks/useFocusMode';
import { DEFAULT_BLOCKLIST, DEFAULT_ALLOWLIST } from '@/types/focusMode';
import { DomainListEditor } from '@/components/focus/DomainListEditor';
import { FocusDurationSelector } from '@/components/focus/FocusDurationSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Focus, Clock, Shield, ShieldCheck, Info, Play, Square } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ModoFoco() {
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

  const handleStartSession = () => {
    if (!selectedDuration || selectedDuration <= 0) {
      toast.error('Selecione uma duração válida');
      return;
    }

    // Check if blocklist is empty and suggest defaults
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
    
    // Small delay to ensure state is updated
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
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Focus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Modo Foco</h1>
          <p className="text-muted-foreground">
            Proteja seu tempo de estudo de distrações
          </p>
        </div>
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className={state.active ? 'border-primary bg-primary/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {state.active ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="text-lg">
                  {state.active ? 'Modo Foco ativo' : 'Modo Foco desligado'}
                </CardTitle>
              </div>
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
              <div className="flex items-center gap-4 text-lg">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-mono font-bold text-2xl text-primary">
                  {remainingFormatted}
                </span>
                {endTimeFormatted && (
                  <span className="text-muted-foreground">
                    termina às {endTimeFormatted}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Você escolheu foco por {state.durationMin} minutos
              </p>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Duration Selector */}
      {!state.active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <FocusDurationSelector
                selectedDuration={selectedDuration}
                onSelect={setSelectedDuration}
                disabled={state.active}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Blocklist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Sites para bloquear
            </CardTitle>
            <CardDescription>
              Estes sites serão bloqueados durante a sessão de foco
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DomainListEditor
              domains={state.blocklist}
              onChange={updateBlocklist}
              placeholder="Digite um site (ex: instagram.com)"
              emptyMessage="Nenhum site na lista de bloqueio"
              disabled={state.active}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Allowlist */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Exceções permitidas
            </CardTitle>
            <CardDescription>
              Estes sites sempre estarão liberados, mesmo durante o foco
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DomainListEditor
              domains={state.allowlist}
              onChange={updateAllowlist}
              placeholder="Digite uma exceção (ex: docs.google.com)"
              emptyMessage="Nenhuma exceção adicionada"
              disabled={state.active}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Button */}
      {!state.active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            onClick={handleStartSession}
            size="lg"
            className="w-full gap-2 h-12 text-base"
            disabled={!selectedDuration}
          >
            <Play className="h-5 w-5" />
            Iniciar sessão de foco
          </Button>
        </motion.div>
      )}

      {state.active && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button 
            onClick={() => setShowEndDialog(true)}
            size="lg"
            variant="outline"
            className="w-full gap-2 h-12 text-base"
          >
            <Square className="h-5 w-5" />
            Encerrar sessão
          </Button>
        </motion.div>
      )}

      {/* Info Alert */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Bloqueio total do navegador será habilitado com uma extensão. 
            Por enquanto, a NOMOS te ajuda com o ritual, o timer e lembretes — 
            sem monitorar sua navegação.
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Suggest Defaults Dialog */}
      <AlertDialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar sites populares?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua lista de bloqueio está vazia. Quer adicionar os sites mais comuns de distração?
              <br /><br />
              <span className="text-muted-foreground">
                Instagram, TikTok, YouTube, X/Twitter, Facebook, Reddit
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartWithoutDefaults}>
              Iniciar sem sites
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleStartWithDefaults}>
              Adicionar e iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End Session Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar sessão de foco?</AlertDialogTitle>
            <AlertDialogDescription>
              Você ainda tem {remainingFormatted} restantes. 
              Tudo bem ajustar — você pode reiniciar quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar focando</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndSession}>
              Encerrar sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
