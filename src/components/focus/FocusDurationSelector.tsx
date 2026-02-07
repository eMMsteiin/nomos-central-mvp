import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DURATION_PRESETS } from '@/types/focusMode';
import { cn } from '@/lib/utils';

interface FocusDurationSelectorProps {
  selectedDuration: number | null;
  onSelect: (duration: number) => void;
  disabled?: boolean;
}

export function FocusDurationSelector({
  selectedDuration,
  onSelect,
  disabled = false,
}: FocusDurationSelectorProps) {
  const [customValue, setCustomValue] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetClick = (duration: number) => {
    setIsCustom(false);
    onSelect(duration);
  };

  const handleCustomChange = (value: string) => {
    setCustomValue(value);
    setIsCustom(true);
    
    const num = parseInt(value, 10);
    if (num > 0 && num <= 480) {
      onSelect(num);
    }
  };

  const handleCustomFocus = () => {
    setIsCustom(true);
    if (customValue) {
      const num = parseInt(customValue, 10);
      if (num > 0) onSelect(num);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Duração
      </p>
      
      <div className="flex flex-wrap gap-1.5">
        {DURATION_PRESETS.map((duration) => (
          <Button
            key={duration}
            variant={selectedDuration === duration && !isCustom ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(duration)}
            disabled={disabled}
            className={cn(
              'h-8 min-w-[60px] text-xs',
              selectedDuration === duration && !isCustom && 'border-foreground'
            )}
          >
            {duration}m
          </Button>
        ))}
        
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            onFocus={handleCustomFocus}
            placeholder="..."
            disabled={disabled}
            min={1}
            max={480}
            className={cn(
              'w-14 h-8 text-xs text-center',
              isCustom && customValue && 'border-foreground'
            )}
          />
          <span className="text-xs text-muted-foreground">m</span>
        </div>
      </div>
    </div>
  );
}
