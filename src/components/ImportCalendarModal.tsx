import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';
import { fetchAndParseICS, ICSEvent } from '@/services/icsImporter';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: (events: ICSEvent[]) => void;
}

export function ImportCalendarModal({ open, onOpenChange, onImportSuccess }: Props) {
  const [icsUrl, setIcsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleImport = async () => {
    if (!icsUrl.trim()) {
      setError('Cole o link do calendário');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const events = await fetchAndParseICS(icsUrl);
      
      toast.success('✅ Importação concluída!', {
        description: `${events.length} tarefas foram importadas do AVA.`,
      });
      
      onImportSuccess(events);
      onOpenChange(false);
      setIcsUrl('');
      
    } catch (err) {
      setError('Não foi possível importar. Verifique o link.');
      toast.error('❌ Erro na importação', {
        description: 'Verifique se o link está correto.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5" />
            Importar do AVA
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Cole o link do calendário .ics
            </label>
            <Input
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              placeholder="https://ava.sua-universidade.br/calendar/export.php?..."
              disabled={loading}
              className="h-12 text-base"
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
          
          <div className="bg-[hsl(var(--todoist-orange-bg))] p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium">💡 Como encontrar o link?</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Entre no AVA da sua universidade</li>
              <li>Vá em <strong>Calendário</strong></li>
              <li>Clique em <strong>Exportar</strong> ou <strong>Assinar</strong></li>
              <li>Copie o link que termina com <code>.ics</code></li>
            </ol>
          </div>
          
          <Button 
            onClick={handleImport} 
            disabled={loading}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-5 w-5" />
                Importar Tarefas
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
