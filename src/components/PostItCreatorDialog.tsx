import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImagePlus, Plus } from 'lucide-react';
import { PostIt, POST_IT_COLORS, POST_IT_COLOR_LABELS } from '@/types/postit';
import { toast } from 'sonner';

interface PostItCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePostIt: (postIt: Omit<PostIt, 'blockId'>) => void;
}

export const PostItCreatorDialog = ({ open, onOpenChange, onCreatePostIt }: PostItCreatorDialogProps) => {
  const [text, setText] = useState('');
  const [selectedColor, setSelectedColor] = useState<keyof typeof POST_IT_COLORS>('areia');
  const [imageUrl, setImageUrl] = useState<string>();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Imagem muito grande! Máximo 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = () => {
    if (!text.trim() && !imageUrl) {
      toast.error('Adicione texto ou uma imagem ao post-it');
      return;
    }

    // Randomize initial position within a reasonable range
    const randomX = Math.floor(Math.random() * 400) + 50;
    const randomY = Math.floor(Math.random() * 300) + 50;

    const newPostIt: Omit<PostIt, 'blockId'> = {
      id: `postit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      color: selectedColor,
      imageUrl,
      position: { x: randomX, y: randomY },
      createdAt: new Date().toISOString(),
      width: 200,
      height: 200,
      rotation: Math.random() * 6 - 3 // Random rotation between -3 and 3 degrees
    };

    onCreatePostIt(newPostIt);
    
    // Reset form
    setText('');
    setImageUrl(undefined);
    setSelectedColor('areia');
    
    // Close dialog
    onOpenChange(false);
    
    toast.success('Post-it adicionado ao quadro!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Lembrete</DialogTitle>
          <DialogDescription>
            Escolha a cor, adicione seu texto e uma imagem opcional para o post-it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Cor do Post-it</Label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(POST_IT_COLORS) as Array<keyof typeof POST_IT_COLORS>).map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-12 h-12 rounded-lg transition-all hover:scale-110 ${
                    selectedColor === color ? 'ring-4 ring-primary ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: POST_IT_COLORS[color] }}
                  title={POST_IT_COLOR_LABELS[color]}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="postit-text" className="text-sm font-medium mb-2 block">
              Texto
            </Label>
            <Textarea
              id="postit-text"
              placeholder="Escreva seu lembrete..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          <div>
            <Label htmlFor="postit-image" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg p-4 hover:border-primary">
                <ImagePlus className="w-5 h-5" />
                <span>{imageUrl ? 'Imagem adicionada ✓' : 'Adicionar imagem (opcional)'}</span>
              </div>
              <input
                id="postit-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </Label>
            {imageUrl && (
              <div className="mt-3 relative inline-block">
                <img src={imageUrl} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => setImageUrl(undefined)}
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar ao Quadro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
