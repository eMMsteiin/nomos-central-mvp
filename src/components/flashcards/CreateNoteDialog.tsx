import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Eye, FileText, RotateCcw, Brackets } from 'lucide-react';
import { NoteType, BUILTIN_NOTE_TYPES } from '@/types/note';
import { parseClozeText, validateClozeText, insertCloze } from '@/utils/clozeParser';
import { previewTemplate } from '@/utils/templateRenderer';
import { useNotes } from '@/hooks/useNotes';
import { toast } from 'sonner';

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckId: string;
  onNoteCreated?: () => void;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  deckId,
  onNoteCreated,
}: CreateNoteDialogProps) {
  const { noteTypes, templates, createNote, createBasicNote, createClozeNote, getTemplatesForNoteType } = useNotes();
  
  const [selectedNoteTypeId, setSelectedNoteTypeId] = useState<string>('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState('front');

  // Get selected note type
  const selectedNoteType = useMemo(() => 
    noteTypes.find(nt => nt.id === selectedNoteTypeId),
    [noteTypes, selectedNoteTypeId]
  );

  // Auto-select Basic type when dialog opens
  useMemo(() => {
    if (open && noteTypes.length > 0 && !selectedNoteTypeId) {
      const basicType = noteTypes.find(nt => nt.name === BUILTIN_NOTE_TYPES.BASIC);
      if (basicType) {
        setSelectedNoteTypeId(basicType.id);
      }
    }
  }, [open, noteTypes, selectedNoteTypeId]);

  // Get templates for selected type
  const noteTemplates = useMemo(() => 
    selectedNoteType ? getTemplatesForNoteType(selectedNoteType.id) : [],
    [selectedNoteType, getTemplatesForNoteType]
  );

  // Calculate preview
  const preview = useMemo(() => {
    if (!selectedNoteType || noteTemplates.length === 0) return null;
    
    const template = noteTemplates[0];
    return previewTemplate(
      template,
      fields,
      selectedNoteType.isCloze,
      1 // First cloze card
    );
  }, [selectedNoteType, noteTemplates, fields]);

  // Validate form
  const isValid = useMemo(() => {
    if (!selectedNoteType) return false;
    
    // Check required fields are filled
    const fieldNames = selectedNoteType.fields.map(f => f.name);
    const primaryField = fieldNames[0];
    
    if (!fields[primaryField]?.trim()) return false;
    
    // For cloze, validate syntax
    if (selectedNoteType.isCloze) {
      const textField = fields['Text'] || '';
      const errors = validateClozeText(textField);
      return errors.length === 0;
    }
    
    return true;
  }, [selectedNoteType, fields]);

  // Cloze info
  const clozeInfo = useMemo(() => {
    if (!selectedNoteType?.isCloze) return null;
    
    const textField = fields['Text'] || '';
    const parsed = parseClozeText(textField);
    return {
      cardCount: parsed.uniqueNumbers.length,
      errors: validateClozeText(textField),
    };
  }, [selectedNoteType, fields]);

  const handleNoteTypeChange = (typeId: string) => {
    setSelectedNoteTypeId(typeId);
    setFields({});
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setFields(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleInsertCloze = () => {
    const textArea = document.querySelector('textarea[data-field="Text"]') as HTMLTextAreaElement;
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = fields['Text'] || '';

    if (start === end) {
      // No selection - insert empty cloze template
      const parsed = parseClozeText(text);
      const nextNumber = Math.max(0, ...parsed.uniqueNumbers, 0) + 1;
      const newText = text.substring(0, start) + `{{c${nextNumber}::}}` + text.substring(end);
      handleFieldChange('Text', newText);
      
      // Set cursor position inside the cloze
      setTimeout(() => {
        textArea.focus();
        const cursorPos = start + `{{c${nextNumber}::`.length;
        textArea.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    } else {
      // Selection - wrap in cloze
      const newText = insertCloze(text, start, end);
      handleFieldChange('Text', newText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedNoteType) return;

    setIsSubmitting(true);
    try {
      await createNote(deckId, selectedNoteType.id, fields);
      
      toast.success(
        selectedNoteType.isCloze
          ? `${clozeInfo?.cardCount || 1} cards criados!`
          : selectedNoteType.name === BUILTIN_NOTE_TYPES.BASIC_REVERSED
          ? '2 cards criados (frente e verso)!'
          : 'Card criado!'
      );
      
      handleClose();
      onNoteCreated?.();
    } catch (error) {
      console.error('Error creating note:', error);
      toast.error('Erro ao criar nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFields({});
    setShowPreview(false);
    onOpenChange(false);
  };

  const getFieldPlaceholder = (fieldName: string): string => {
    const placeholders: Record<string, string> = {
      'Front': 'Ex: Qual é a capital do Brasil?',
      'Back': 'Ex: Brasília',
      'Text': 'Ex: A {{c1::mitocôndria}} é a {{c2::usina de energia}} da célula.',
      'Extra': 'Informações adicionais (opcional)',
    };
    return placeholders[fieldName] || '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Nota
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Note Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Nota</Label>
            <Select value={selectedNoteTypeId} onValueChange={handleNoteTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {noteTypes.map(nt => (
                  <SelectItem key={nt.id} value={nt.id}>
                    <span className="flex items-center gap-2">
                      {nt.name === BUILTIN_NOTE_TYPES.BASIC && <FileText className="h-4 w-4" />}
                      {nt.name === BUILTIN_NOTE_TYPES.BASIC_REVERSED && <RotateCcw className="h-4 w-4" />}
                      {nt.name === BUILTIN_NOTE_TYPES.CLOZE && <Brackets className="h-4 w-4" />}
                      {nt.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type description */}
            {selectedNoteType && (
              <p className="text-xs text-muted-foreground">
                {selectedNoteType.name === BUILTIN_NOTE_TYPES.BASIC && 
                  'Cria 1 card: Frente → Verso'}
                {selectedNoteType.name === BUILTIN_NOTE_TYPES.BASIC_REVERSED && 
                  'Cria 2 cards: Frente → Verso e Verso → Frente'}
                {selectedNoteType.name === BUILTIN_NOTE_TYPES.CLOZE && 
                  'Cria cards de lacuna. Use {{c1::texto}} para criar lacunas.'}
              </p>
            )}
          </div>

          {/* Fields */}
          {selectedNoteType && (
            <div className="space-y-4">
              {selectedNoteType.fields
                .sort((a, b) => a.ord - b.ord)
                .map(field => (
                  <div key={field.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`field-${field.name}`}>{field.name}</Label>
                      {field.name === 'Text' && selectedNoteType.isCloze && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleInsertCloze}
                          className="h-7 text-xs"
                        >
                          <Brackets className="h-3 w-3 mr-1" />
                          Inserir Cloze
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id={`field-${field.name}`}
                      data-field={field.name}
                      value={fields[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      placeholder={getFieldPlaceholder(field.name)}
                      rows={field.name === 'Text' ? 4 : 3}
                      className="resize-none"
                    />
                  </div>
                ))}
            </div>
          )}

          {/* Cloze Info */}
          {clozeInfo && (
            <div className={`p-3 rounded-lg border ${
              clozeInfo.errors.length > 0 
                ? 'bg-destructive/10 border-destructive/30' 
                : 'bg-primary/10 border-primary/30'
            }`}>
              {clozeInfo.errors.length > 0 ? (
                <p className="text-sm text-destructive">
                  {clozeInfo.errors[0]}
                </p>
              ) : (
                <p className="text-sm text-primary">
                  ✓ {clozeInfo.cardCount} card{clozeInfo.cardCount !== 1 ? 's' : ''} será{clozeInfo.cardCount !== 1 ? 'ão' : ''} gerado{clozeInfo.cardCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Preview Toggle */}
          {selectedNoteType && preview && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {showPreview ? 'Ocultar Preview' : 'Mostrar Preview'}
              </Button>

              {showPreview && (
                <Tabs value={previewTab} onValueChange={setPreviewTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="front">Frente</TabsTrigger>
                    <TabsTrigger value="back">Verso</TabsTrigger>
                  </TabsList>
                  <TabsContent value="front" className="mt-2">
                    <div 
                      className="p-4 border rounded-lg bg-background min-h-[100px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.front || '<em class="text-muted-foreground">Vazio</em>' }}
                    />
                  </TabsContent>
                  <TabsContent value="back" className="mt-2">
                    <div 
                      className="p-4 border rounded-lg bg-background min-h-[100px] prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: preview.back || '<em class="text-muted-foreground">Vazio</em>' }}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </form>

        <DialogFooter className="pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
