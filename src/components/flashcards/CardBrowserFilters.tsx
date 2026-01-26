// ============================================================================
// BLOCO 4: Card Browser Filters
// Filter panel for the card browser
// ============================================================================

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Deck, CardState } from '@/types/flashcard';
import { NoteType } from '@/types/note';

export interface BrowserFilters {
  deckId: string;
  state: CardState | 'all';
  noteTypeId: string;
  intervalMin?: number;
  intervalMax?: number;
  easeMin?: number;
  easeMax?: number;
}

interface CardBrowserFiltersProps {
  filters: BrowserFilters;
  onFiltersChange: (filters: BrowserFilters) => void;
  decks: Deck[];
  noteTypes: NoteType[];
  onClose: () => void;
}

const CARD_STATES: { value: CardState | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos os estados' },
  { value: 'new', label: 'Novo' },
  { value: 'learning', label: 'Aprendendo' },
  { value: 'review', label: 'Revisão' },
  { value: 'relearning', label: 'Reaprendendo' },
  { value: 'suspended', label: 'Suspenso' },
  { value: 'buried', label: 'Enterrado' },
];

const INTERVAL_PRESETS = [
  { label: 'Qualquer', min: undefined, max: undefined },
  { label: '< 1 dia', min: undefined, max: 0 },
  { label: '1-7 dias', min: 1, max: 7 },
  { label: '7-30 dias', min: 7, max: 30 },
  { label: '30-90 dias', min: 30, max: 90 },
  { label: '> 90 dias', min: 90, max: undefined },
];

const EASE_PRESETS = [
  { label: 'Qualquer', min: undefined, max: undefined },
  { label: 'Difíceis (< 200%)', min: undefined, max: 2.0 },
  { label: 'Normais (200-250%)', min: 2.0, max: 2.5 },
  { label: 'Fáceis (> 250%)', min: 2.5, max: undefined },
];

export function CardBrowserFilters({
  filters,
  onFiltersChange,
  decks,
  noteTypes,
  onClose,
}: CardBrowserFiltersProps) {
  const updateFilter = <K extends keyof BrowserFilters>(
    key: K,
    value: BrowserFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      deckId: 'all',
      state: 'all',
      noteTypeId: 'all',
      intervalMin: undefined,
      intervalMax: undefined,
      easeMin: undefined,
      easeMax: undefined,
    });
  };

  const handleIntervalPreset = (preset: typeof INTERVAL_PRESETS[0]) => {
    onFiltersChange({
      ...filters,
      intervalMin: preset.min,
      intervalMax: preset.max,
    });
  };

  const handleEasePreset = (preset: typeof EASE_PRESETS[0]) => {
    onFiltersChange({
      ...filters,
      easeMin: preset.min,
      easeMax: preset.max,
    });
  };

  // Get current interval preset label
  const currentIntervalPreset = INTERVAL_PRESETS.find(
    p => p.min === filters.intervalMin && p.max === filters.intervalMax
  )?.label || 'Personalizado';

  // Get current ease preset label
  const currentEasePreset = EASE_PRESETS.find(
    p => p.min === filters.easeMin && p.max === filters.easeMax
  )?.label || 'Personalizado';

  return (
    <div className="p-4 border-b bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filtros</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Deck Filter */}
        <div className="space-y-2">
          <Label>Deck</Label>
          <Select
            value={filters.deckId}
            onValueChange={(value) => updateFilter('deckId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um deck" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os decks</SelectItem>
              {decks.map(deck => (
                <SelectItem key={deck.id} value={deck.id}>
                  {deck.emoji} {deck.fullName || deck.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State Filter */}
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select
            value={filters.state}
            onValueChange={(value) => updateFilter('state', value as CardState | 'all')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {CARD_STATES.map(state => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note Type Filter */}
        <div className="space-y-2">
          <Label>Tipo de Nota</Label>
          <Select
            value={filters.noteTypeId}
            onValueChange={(value) => updateFilter('noteTypeId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Todos os tipos</SelectItem>
              {noteTypes.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interval Filter */}
        <div className="space-y-2">
          <Label>Intervalo</Label>
          <Select
            value={currentIntervalPreset}
            onValueChange={(value) => {
              const preset = INTERVAL_PRESETS.find(p => p.label === value);
              if (preset) handleIntervalPreset(preset);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o intervalo" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {INTERVAL_PRESETS.map(preset => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ease Filter */}
        <div className="space-y-2">
          <Label>Facilidade</Label>
          <Select
            value={currentEasePreset}
            onValueChange={(value) => {
              const preset = EASE_PRESETS.find(p => p.label === value);
              if (preset) handleEasePreset(preset);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a facilidade" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {EASE_PRESETS.map(preset => (
                <SelectItem key={preset.label} value={preset.label}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Interval Range */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Intervalo personalizado (dias)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.intervalMin ?? ''}
              onChange={(e) => updateFilter('intervalMin', e.target.value ? Number(e.target.value) : undefined)}
              className="h-9"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.intervalMax ?? ''}
              onChange={(e) => updateFilter('intervalMax', e.target.value ? Number(e.target.value) : undefined)}
              className="h-9"
            />
          </div>
        </div>

        {/* Custom Ease Range */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs">Facilidade personalizada (%)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.easeMin ? (filters.easeMin * 100).toFixed(0) : ''}
              onChange={(e) => updateFilter('easeMin', e.target.value ? Number(e.target.value) / 100 : undefined)}
              className="h-9"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.easeMax ? (filters.easeMax * 100).toFixed(0) : ''}
              onChange={(e) => updateFilter('easeMax', e.target.value ? Number(e.target.value) / 100 : undefined)}
              className="h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
