import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ImagePlus, Plus } from 'lucide-react';
import { PostIt, POST_IT_COLORS, POST_IT_COLOR_LABELS } from '@/types/postit';
import { toast } from 'sonner';

interface PostItCreatorProps {
  onCreatePostIt: (postIt: PostIt) => void;
}

export const PostItCreator = ({ onCreatePostIt }: PostItCreatorProps) => {
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

    const newPostIt: PostIt = {
      id: `postit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      color: selectedColor,
      imageUrl,
      position: { x: 100, y: 100 },
      tab: 'lembretes',
      createdAt: new Date().toISOString(),
      width: 200,
      height: 200,
      rotation: Math.random() * 4 - 2 // Random rotation between -2 and 2 degrees
    };

    onCreatePostIt(newPostIt);
    setText('');
    setImageUrl(undefined);
    toast.success('Post-it criado!');
  };

  return (
    <Card className="p-4 mb-4 border-border bg-card">
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Cor do Post-it</Label>
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
          <Label htmlFor="postit-text" className="text-sm font-medium mb-2 block">Texto</Label>
          <Textarea
            id="postit-text"
            placeholder="Escreva seu lembrete..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="postit-image" className="cursor-pointer">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ImagePlus className="w-4 h-4" />
                <span>{imageUrl ? 'Imagem adicionada' : 'Adicionar imagem'}</span>
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
              <img src={imageUrl} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded" />
            )}
          </div>

          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar ao Quadro
          </Button>
        </div>
      </div>
    </Card>
  );
};
