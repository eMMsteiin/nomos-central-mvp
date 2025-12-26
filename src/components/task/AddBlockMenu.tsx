import { useRef } from 'react';
import { Plus, CheckSquare, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AddBlockMenuProps {
  onAddSubtask: () => void;
  onAddImage: (file: File) => void;
}

export function AddBlockMenu({ onAddSubtask, onAddImage }: AddBlockMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddImage(file);
      e.target.value = '';
    }
  };

  return (
    <div className="py-2 px-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground hover:text-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Adicionar bloco</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onAddSubtask} className="gap-2">
            <CheckSquare className="h-4 w-4" />
            <span>Subtarefa</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImageClick} className="gap-2">
            <Image className="h-4 w-4" />
            <span>Imagem</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
