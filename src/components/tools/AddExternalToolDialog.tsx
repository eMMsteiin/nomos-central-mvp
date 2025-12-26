import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRESET_TOOLS, CATEGORY_LABELS, PresetTool } from '@/types/externalTool';
import { useExternalTools } from '@/contexts/ExternalToolsContext';
import { ToolIcon } from './ToolIcon';
import { Check, Plus, Link, ExternalLink, MonitorPlay } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface AddExternalToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMOJI_OPTIONS = ['🔧', '📚', '🎯', '💻', '📝', '🎨', '📊', '🗂️', '✏️', '🌐'];

export function AddExternalToolDialog({ open, onOpenChange }: AddExternalToolDialogProps) {
  const { userTools, addTool } = useExternalTools();
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🔧');

  const addedToolUrls = new Set(userTools.map(t => t.url));

  const handleAddPreset = (preset: PresetTool) => {
    if (addedToolUrls.has(preset.url)) {
      toast.error('Esta ferramenta já foi adicionada');
      return;
    }

    addTool({
      name: preset.name,
      url: preset.url,
      icon: preset.icon,
      iconColor: preset.iconColor,
      isCustom: false,
      canEmbed: preset.canEmbed,
    });
    toast.success(`${preset.name} adicionado à sidebar`);
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      toast.error('Digite um nome para a ferramenta');
      return;
    }

    let url = customUrl.trim();
    if (!url) {
      toast.error('Digite a URL da ferramenta');
      return;
    }

    // Add https:// if not present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      new URL(url); // Validate URL
    } catch {
      toast.error('URL inválida');
      return;
    }

    if (addedToolUrls.has(url)) {
      toast.error('Esta URL já foi adicionada');
      return;
    }

    addTool({
      name: customName.trim(),
      url,
      icon: customEmoji,
      isCustom: true,
      canEmbed: true, // Ferramentas personalizadas tentam iframe
    });

    toast.success(`${customName} adicionado à sidebar`);
    setCustomName('');
    setCustomUrl('');
    setCustomEmoji('🔧');
    onOpenChange(false);
  };

  const groupedPresets = PRESET_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, PresetTool[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Ferramenta Externa</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preset" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">Pré-definidas</TabsTrigger>
            <TabsTrigger value="custom">Link Personalizado</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Info sobre ferramentas pré-definidas */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span>Estas ferramentas abrem em janela ao lado por restrições dos sites.</span>
            </div>
            
            {Object.entries(groupedPresets).map(([category, tools]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {tools.map((tool) => {
                    const isAdded = addedToolUrls.has(tool.url);
                    return (
                      <button
                        key={tool.name}
                        onClick={() => handleAddPreset(tool)}
                        disabled={isAdded}
                        className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                          isAdded
                            ? 'bg-muted/50 border-muted cursor-not-allowed opacity-60'
                            : 'hover:bg-muted/50 border-border hover:border-primary/30'
                        }`}
                      >
                        <ToolIcon icon={tool.icon} color={tool.iconColor} size={18} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium block truncate">{tool.name}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <ExternalLink className="h-2.5 w-2.5" />
                            Janela ao lado
                          </span>
                        </div>
                        {isAdded ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="custom" className="mt-4 space-y-4">
            {/* Info sobre ferramentas personalizadas */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-xs text-primary">
              <MonitorPlay className="h-3.5 w-3.5 shrink-0" />
              <span>Links personalizados abrem dentro da NOMOS (quando permitido pelo site).</span>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-name">Nome da Ferramenta</Label>
              <Input
                id="custom-name"
                placeholder="Ex: Meu site favorito"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-url">URL</Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="custom-url"
                  placeholder="https://exemplo.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCustomEmoji(emoji)}
                    className={`w-10 h-10 flex items-center justify-center text-lg rounded-lg border transition-colors ${
                      customEmoji === emoji
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleAddCustom} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Ferramenta
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
