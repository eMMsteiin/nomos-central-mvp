import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Download, 
  Upload, 
  HardDrive, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  FileJson,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface BackupData {
  version: string;
  exportedAt: string;
  decks: any[];
  cards: any[];
  notes: any[];
  noteTypes: any[];
  reviews: any[];
  sessions: any[];
}

interface BackupRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBackup: () => Promise<BackupData>;
  onRestoreBackup: (data: BackupData) => Promise<void>;
  stats: {
    decks: number;
    cards: number;
    notes: number;
  };
}

export function BackupRestoreDialog({
  open,
  onOpenChange,
  onCreateBackup,
  onRestoreBackup,
  stats,
}: BackupRestoreDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePreview, setRestorePreview] = useState<BackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const handleCreateBackup = async () => {
    setIsCreating(true);
    try {
      const backupData = await onCreateBackup();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nomos-flashcards-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup criado com sucesso!');
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Erro ao criar backup');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestorePreview(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      // Validate backup structure
      if (!data.version || !data.decks || !data.cards) {
        throw new Error('Arquivo de backup inválido');
      }

      setRestorePreview(data);
    } catch (error) {
      console.error('Error reading backup:', error);
      setRestoreError(error instanceof Error ? error.message : 'Erro ao ler arquivo');
    }
  };

  const handleRestore = async () => {
    if (!restorePreview) return;

    setIsRestoring(true);
    try {
      await onRestoreBackup(restorePreview);
      toast.success('Backup restaurado com sucesso!');
      setRestorePreview(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const resetRestoreState = () => {
    setRestorePreview(null);
    setRestoreError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetRestoreState();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Backup Manual
          </DialogTitle>
          <DialogDescription>
            Crie backups completos ou restaure dados salvos anteriormente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{stats.decks}</div>
                  <div className="text-muted-foreground text-xs">Baralhos</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{stats.cards}</div>
                  <div className="text-muted-foreground text-xs">Cards</div>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{stats.notes}</div>
                  <div className="text-muted-foreground text-xs">Notas</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Backup */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Criar Backup</h4>
            <p className="text-xs text-muted-foreground">
              Exporta todos os dados: baralhos, cards, notas, histórico de revisões e configurações
            </p>
            <Button 
              onClick={handleCreateBackup} 
              disabled={isCreating}
              className="w-full"
              variant="outline"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Criar Backup Completo
                </>
              )}
            </Button>
          </div>

          {/* Restore Backup */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium">Restaurar Backup</h4>
            <p className="text-xs text-muted-foreground">
              ⚠️ A restauração irá mesclar os dados do backup com seus dados atuais
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!restorePreview ? (
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Selecionar Arquivo de Backup
              </Button>
            ) : (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Backup válido</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Versão:</span>
                      <span className="ml-1">{restorePreview.version}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data:</span>
                      <span className="ml-1">
                        {format(new Date(restorePreview.exportedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Baralhos:</span>
                      <span className="ml-1">{restorePreview.decks?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cards:</span>
                      <span className="ml-1">{restorePreview.cards?.length || 0}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={resetRestoreState}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleRestore}
                      disabled={isRestoring}
                      className="flex-1"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Restaurando...
                        </>
                      ) : (
                        'Restaurar'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {restoreError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{restoreError}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
