import { useState, useMemo, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Loader2, Eye, Brackets } from 'lucide-react';
import { Note, NoteType } from '@/types/note';
import { parseClozeText, validateClozeText, insertCloze } from '@/utils/clozeParser';
import { previewTemplate } from '@/utils/templateRenderer';
import { useNotes } from '@/hooks/useNotes';
import { toast } from 'sonner';

interface EditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onNoteUpdated?: () => void;
}

export function EditNoteDialog({
  open,
  onOpenChange,
  note,
  onNoteUpdated,
}: EditNoteDialogProps) {
  const { noteTypes, templates, updateNote, getTemplatesForNoteType, getNoteTypeById } = useNotes();
  
  const [fields, setFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTab, setPreviewTab] = useState('front');

  // Initialize fields when note changes
  useEffect(() => {
    if (note) {
      setFields({ ...note.fields });
    }
  }, [note]);

  // Get note type
  const noteType = useMemo(() => 
    note ? getNoteTypeById(note.noteTypeId) : undefined,
    [note, getNoteTypeById]
  );

  // Get templates for note type
  const noteTemplates = useMemo(() => 
    noteType ? getTemplatesForNoteType(noteType.id) : [],
    [noteType, getTemplatesForNoteType]
  );

  // Calculate preview
  const preview = useMemo(() => {
    if (!noteType || noteTemplates.length === 0) return null;
    
    const template = noteTemplates[0];
    return previewTemplate(
      template,
      fields,
      noteType.isCloze,
      1
    );
  }, [noteType, noteTemplates, fields]);

  // Validate form
  const isValid = useMemo(() => {
    if (!noteType) return false;
    
    const fieldNames = noteType.fields.map(f => f.name);
    const primaryField = fieldNames[0];
    
    if (!fields[primaryField]?.trim()) return false;
    
    if (noteType.isCloze) {
      const textField = fields['Text'] || '';
      const errors = validateClozeText(textField);
      return errors.length === 0;
    }
    
    return true;
  }, [noteType, fields]);

  // Cloze info
  const clozeInfo = useMemo(() => {
    if (!noteType?.isCloze) return null;
    
    const textField = fields['Text'] || '';
    const parsed = parseClozeText(textField);
    return {
      cardCount: parsed.uniqueNumbers.length,
      errors: validateClozeText(textField),
    };
  }, [noteType, fields]);

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
      const parsed = parseClozeText(text);
      const nextNumber = Math.max(0, ...parsed.uniqueNumbers, 0) + 1;
      const newText = text.substring(0, start) + `{{c${nextNumber}::}}` + text.substring(end);
      handleFieldChange('Text', newText);
      
      setTimeout(() => {
        textArea.focus();
        const cursorPos = start + `{{c${nextNumber}::`.length;
        textArea.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    } else {
      const newText = insertCloze(text, start, end);
      handleFieldChange('Text', newText);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !note) return;

    setIsSubmitting(true);
    try {
      await updateNote(note.id, fields);
      
      toast.success('Nota atualizada!');
      
      handleClose();
      onNoteUpdated?.();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Erro ao atualizar nota');
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

  if (!note || !noteType) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Editar Nota
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tipo: {noteType.name}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Fields */}
          <div className="space-y-4">
            {noteType.fields
              .sort((a, b) => a.ord - b.ord)
              .map(field => (
                <div key={field.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`field-${field.name}`}>{field.name}</Label>
                    {field.name === 'Text' && noteType.isCloze && (
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
          {preview && (
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
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
