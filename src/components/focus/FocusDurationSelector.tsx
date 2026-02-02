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
    if (num > 0 && num <= 480) { // Max 8 hours
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
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Duração da sessão
      </p>
      
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((duration) => (
          <Button
            key={duration}
            variant={selectedDuration === duration && !isCustom ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(duration)}
            disabled={disabled}
            className={cn(
              'min-w-[70px]',
              selectedDuration === duration && !isCustom && 'ring-2 ring-primary ring-offset-2'
            )}
          >
            {duration} min
          </Button>
        ))}
        
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={customValue}
            onChange={(e) => handleCustomChange(e.target.value)}
            onFocus={handleCustomFocus}
            placeholder="Outro"
            disabled={disabled}
            min={1}
            max={480}
            className={cn(
              'w-20 text-center',
              isCustom && customValue && 'ring-2 ring-primary ring-offset-2'
            )}
          />
          <span className="text-sm text-muted-foreground">min</span>
        </div>
      </div>
    </div>
  );
}
