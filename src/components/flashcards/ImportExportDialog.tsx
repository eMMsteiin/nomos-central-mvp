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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Deck, Flashcard } from '@/types/flashcard';
import { NoteType, Note } from '@/types/note';
import { toast } from 'sonner';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decks: Deck[];
  cards: Flashcard[];
  notes: Note[];
  noteTypes: NoteType[];
  onImport: (data: ImportData) => Promise<void>;
  onExport: (deckId: string | 'all', format: 'csv' | 'json') => Promise<void>;
}

interface ImportData {
  deckId: string;
  noteTypeId: string;
  cards: Array<{ front: string; back: string; tags?: string[] }>;
}

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  front: string;
  back: string;
  tags?: string;
}

export function ImportExportDialog({
  open,
  onOpenChange,
  decks,
  cards,
  notes,
  noteTypes,
  onImport,
  onExport,
}: ImportExportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  
  // Import state
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [selectedNoteTypeId, setSelectedNoteTypeId] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ front: '', back: '' });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  // Export state
  const [exportDeckId, setExportDeckId] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const resetImportState = () => {
    setCsvData([]);
    setCsvColumns([]);
    setColumnMapping({ front: '', back: '' });
    setImportError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseCSV = (text: string): { rows: CSVRow[]; columns: string[] } => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) throw new Error('Arquivo vazio');

    // Parse header
    const header = parseCSVLine(lines[0]);
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: CSVRow = {};
      header.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });
      rows.push(row);
    }

    return { rows, columns: header };
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);

    try {
      const text = await file.text();
      const { rows, columns } = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo');
      }

      setCsvData(rows);
      setCsvColumns(columns);

      // Auto-detect column mappings
      const frontColumn = columns.find(c => 
        c.toLowerCase().includes('front') || 
        c.toLowerCase().includes('frente') ||
        c.toLowerCase().includes('pergunta') ||
        c.toLowerCase().includes('question')
      );
      const backColumn = columns.find(c => 
        c.toLowerCase().includes('back') || 
        c.toLowerCase().includes('verso') ||
        c.toLowerCase().includes('resposta') ||
        c.toLowerCase().includes('answer')
      );
      const tagsColumn = columns.find(c => 
        c.toLowerCase().includes('tag') || 
        c.toLowerCase().includes('etiqueta')
      );

      setColumnMapping({
        front: frontColumn || columns[0] || '',
        back: backColumn || columns[1] || '',
        tags: tagsColumn,
      });

      toast.success(`${rows.length} registros encontrados`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setImportError(error instanceof Error ? error.message : 'Erro ao ler arquivo');
      setCsvData([]);
      setCsvColumns([]);
    }
  };

  const handleImport = async () => {
    if (!selectedDeckId || !selectedNoteTypeId || !columnMapping.front || !columnMapping.back) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (csvData.length === 0) {
      toast.error('Nenhum dado para importar');
      return;
    }

    setIsImporting(true);
    try {
      const cardsToImport = csvData.map(row => ({
        front: row[columnMapping.front] || '',
        back: row[columnMapping.back] || '',
        tags: columnMapping.tags ? row[columnMapping.tags]?.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      })).filter(card => card.front && card.back);

      if (cardsToImport.length === 0) {
        throw new Error('Nenhum card válido encontrado');
      }

      await onImport({
        deckId: selectedDeckId,
        noteTypeId: selectedNoteTypeId,
        cards: cardsToImport,
      });

      toast.success(`${cardsToImport.length} cards importados com sucesso!`);
      resetImportState();
      onOpenChange(false);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar cards');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportDeckId, exportFormat);
      toast.success('Exportação concluída!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const previewCards = csvData.slice(0, 5).map(row => ({
    front: row[columnMapping.front] || '-',
    back: row[columnMapping.back] || '-',
  }));

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) resetImportState();
      onOpenChange(value);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar / Exportar</DialogTitle>
          <DialogDescription>
            Importe cards de arquivos CSV ou exporte seus decks
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            {/* File Upload */}
            <div>
              <Label>Arquivo CSV</Label>
              <div className="mt-1.5">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Formatos: CSV (separado por vírgula, ponto e vírgula ou tab)
              </p>
            </div>

            {importError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            {csvColumns.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Baralho de destino *</Label>
                    <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione um baralho" />
                      </SelectTrigger>
                      <SelectContent>
                        {decks.map(deck => (
                          <SelectItem key={deck.id} value={deck.id}>
                            {deck.emoji} {deck.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tipo de Nota *</Label>
                    <Select value={selectedNoteTypeId} onValueChange={setSelectedNoteTypeId}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {noteTypes.map(nt => (
                          <SelectItem key={nt.id} value={nt.id}>
                            {nt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Column Mapping */}
                <div>
                  <Label className="mb-2 block">Mapeamento de Colunas</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Frente *</Label>
                      <Select 
                        value={columnMapping.front} 
                        onValueChange={(v) => setColumnMapping(prev => ({ ...prev, front: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Verso *</Label>
                      <Select 
                        value={columnMapping.back} 
                        onValueChange={(v) => setColumnMapping(prev => ({ ...prev, back: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tags (opcional)</Label>
                      <Select 
                        value={columnMapping.tags || ''} 
                        onValueChange={(v) => setColumnMapping(prev => ({ ...prev, tags: v || undefined }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Nenhuma" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhuma</SelectItem>
                          {csvColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Preview (primeiros 5 registros)</Label>
                    <Badge variant="secondary">{csvData.length} registros</Badge>
                  </div>
                  <ScrollArea className="flex-1 border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-1/2">Frente</TableHead>
                          <TableHead className="w-1/2">Verso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewCards.map((card, i) => (
                          <TableRow key={i}>
                            <TableCell className="max-w-[200px] truncate">{card.front}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{card.back}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!selectedDeckId || !selectedNoteTypeId || !columnMapping.front || !columnMapping.back || csvData.length === 0 || isImporting}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar {csvData.length} cards
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="export" className="flex-1 overflow-hidden flex flex-col mt-4 space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Baralho</Label>
                <Select value={exportDeckId} onValueChange={setExportDeckId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📚 Todos os baralhos</SelectItem>
                    {decks.map(deck => (
                      <SelectItem key={deck.id} value={deck.id}>
                        {deck.emoji} {deck.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Formato</Label>
                <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'json')}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (compatível com Anki)</SelectItem>
                    <SelectItem value="json">JSON (backup completo)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {exportFormat === 'csv' 
                    ? 'Exporta cards em formato CSV para importação no Anki' 
                    : 'Exporta todos os dados incluindo estados de repetição'}
                </p>
              </div>

              {/* Export preview */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>
                    {exportDeckId === 'all' 
                      ? `${cards.length} cards de ${decks.length} baralhos`
                      : `${cards.filter(c => c.deckId === exportDeckId).length} cards`}
                  </span>
                </div>
                {exportFormat === 'json' && (
                  <div className="text-xs text-muted-foreground">
                    Inclui: decks, cards, notes, estados de repetição, configurações
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
