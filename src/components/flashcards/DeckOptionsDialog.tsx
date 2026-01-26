import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Deck, DeckConfig, DeckOptionPreset, DEFAULT_DECK_CONFIG } from '@/types/flashcard';
import { cn } from '@/lib/utils';

interface DeckOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deck: Deck;
  presets: DeckOptionPreset[];
  parentDeck?: Deck;
  onSave: (config: Partial<DeckConfig>, presetId?: string) => void;
  onSaveAsPreset: (name: string, config: DeckConfig) => void;
}

export function DeckOptionsDialog({
  open,
  onOpenChange,
  deck,
  presets,
  parentDeck,
  onSave,
  onSaveAsPreset,
}: DeckOptionsDialogProps) {
  const [config, setConfig] = useState<DeckConfig>(deck.config);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(deck.presetId || '');
  const [newPresetName, setNewPresetName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setConfig(deck.config);
      setSelectedPresetId(deck.presetId || '');
    }
  }, [open, deck]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'default') {
      setConfig({ ...DEFAULT_DECK_CONFIG });
    } else if (presetId === 'inherit' && parentDeck) {
      setConfig({ ...parentDeck.config });
    } else {
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        setConfig({ ...preset.config });
      }
    }
  };

  const handleSave = () => {
    onSave(config, selectedPresetId === 'default' || selectedPresetId === 'inherit' ? undefined : selectedPresetId);
    onOpenChange(false);
  };

  const handleSaveAsPreset = () => {
    if (newPresetName.trim()) {
      onSaveAsPreset(newPresetName.trim(), config);
      setNewPresetName('');
    }
  };

  const handleReset = () => {
    if (parentDeck) {
      setConfig({ ...parentDeck.config });
      setSelectedPresetId('inherit');
    } else {
      setConfig({ ...DEFAULT_DECK_CONFIG });
      setSelectedPresetId('default');
    }
  };

  const updateConfig = <K extends keyof DeckConfig>(key: K, value: DeckConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setSelectedPresetId(''); // Clear preset when manually editing
  };

  const parseSteps = (value: string): string[] => {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  };

  const formatSteps = (steps: string[]): string => {
    return steps.join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Opções do Baralho: {deck.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preset selection */}
          <div className="space-y-2">
            <Label>Usar Preset</Label>
            <Select value={selectedPresetId} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue placeholder="Personalizado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão Anki</SelectItem>
                {parentDeck && (
                  <SelectItem value="inherit">Herdar do pai ({parentDeck.title})</SelectItem>
                )}
                {presets.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* New Cards */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Cards Novos</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newCardsPerDay">Novos por dia</Label>
                <Input
                  id="newCardsPerDay"
                  type="number"
                  min={0}
                  value={config.newCardsPerDay}
                  onChange={e => updateConfig('newCardsPerDay', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="learningSteps">Passos de aprendizado</Label>
                <Input
                  id="learningSteps"
                  placeholder="1, 10"
                  value={formatSteps(config.learningSteps)}
                  onChange={e => updateConfig('learningSteps', parseSteps(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Em minutos. Use 'd' para dias (ex: 1d)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graduatingInterval">Intervalo de graduação (dias)</Label>
                <Input
                  id="graduatingInterval"
                  type="number"
                  min={1}
                  value={config.graduatingInterval}
                  onChange={e => updateConfig('graduatingInterval', parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="easyInterval">Intervalo Fácil (dias)</Label>
                <Input
                  id="easyInterval"
                  type="number"
                  min={1}
                  value={config.easyInterval}
                  onChange={e => updateConfig('easyInterval', parseInt(e.target.value) || 4)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Reviews */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Revisões</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reviewsPerDay">Revisões por dia</Label>
                <Input
                  id="reviewsPerDay"
                  type="number"
                  min={0}
                  value={config.reviewsPerDay}
                  onChange={e => updateConfig('reviewsPerDay', parseInt(e.target.value) || 0)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxInterval">Intervalo máximo (dias)</Label>
                <Input
                  id="maxInterval"
                  type="number"
                  min={1}
                  value={config.maxInterval}
                  onChange={e => updateConfig('maxInterval', parseInt(e.target.value) || 36500)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Lapses */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Lapsos (Erros)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="relearnSteps">Passos de reaprendizado</Label>
                <Input
                  id="relearnSteps"
                  placeholder="10"
                  value={formatSteps(config.relearnSteps)}
                  onChange={e => updateConfig('relearnSteps', parseSteps(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lapseMinInterval">Intervalo mínimo após lapso (dias)</Label>
                <Input
                  id="lapseMinInterval"
                  type="number"
                  min={1}
                  value={config.lapseMinInterval}
                  onChange={e => updateConfig('lapseMinInterval', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lapseNewInterval">Novo intervalo após lapso (%)</Label>
              <Input
                id="lapseNewInterval"
                type="number"
                min={0}
                max={100}
                value={Math.round(config.lapseNewInterval * 100)}
                onChange={e => updateConfig('lapseNewInterval', (parseInt(e.target.value) || 0) / 100)}
              />
              <p className="text-xs text-muted-foreground">
                0% = reinicia do zero. 50% = metade do intervalo anterior.
              </p>
            </div>
          </div>

          {/* Advanced */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Configurações avançadas</span>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startingEase">Facilidade inicial</Label>
                  <Input
                    id="startingEase"
                    type="number"
                    min={1.3}
                    max={5}
                    step={0.1}
                    value={config.startingEase}
                    onChange={e => updateConfig('startingEase', parseFloat(e.target.value) || 2.5)}
                  />
                  <p className="text-xs text-muted-foreground">
                    2.5 = 250%. Mínimo 1.3
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="intervalModifier">Modificador de intervalo</Label>
                  <Input
                    id="intervalModifier"
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={config.intervalModifier}
                    onChange={e => updateConfig('intervalModifier', parseFloat(e.target.value) || 1.0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    1.0 = 100%. Maior = intervalos mais longos.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="easyBonus">Bônus Fácil</Label>
                  <Input
                    id="easyBonus"
                    type="number"
                    min={1}
                    max={3}
                    step={0.1}
                    value={config.easyBonus}
                    onChange={e => updateConfig('easyBonus', parseFloat(e.target.value) || 1.3)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hardMultiplier">Multiplicador Difícil</Label>
                  <Input
                    id="hardMultiplier"
                    type="number"
                    min={1}
                    max={2}
                    step={0.1}
                    value={config.hardMultiplier}
                    onChange={e => updateConfig('hardMultiplier', parseFloat(e.target.value) || 1.2)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Save as preset */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome do novo preset"
              value={newPresetName}
              onChange={e => setNewPresetName(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={handleSaveAsPreset}
              disabled={!newPresetName.trim()}
            >
              Salvar como Preset
            </Button>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar padrão
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
