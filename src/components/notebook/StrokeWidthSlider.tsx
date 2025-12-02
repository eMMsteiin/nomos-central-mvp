import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Minus, Plus } from 'lucide-react';

interface StrokeWidthSliderProps {
  width: number;
  onChange: (width: number) => void;
  min?: number;
  max?: number;
  color?: string;
}

const PRESETS = [
  { label: 'Fino', value: 2 },
  { label: 'Médio', value: 5 },
  { label: 'Grosso', value: 10 },
  { label: 'Extra', value: 20 },
];

export const StrokeWidthSlider = ({
  width,
  onChange,
  min = 1,
  max = 30,
  color = '#000000',
}: StrokeWidthSliderProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 px-3 min-w-[80px]">
          <div
            className="rounded-full"
            style={{
              width: Math.min(width, 16),
              height: Math.min(width, 16),
              backgroundColor: color,
              minWidth: 4,
              minHeight: 4,
            }}
          />
          <span className="text-xs text-muted-foreground">{width}px</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center justify-center h-12 bg-muted rounded-md">
            <div
              className="rounded-full transition-all"
              style={{
                width: width,
                height: width,
                backgroundColor: color,
              }}
            />
          </div>

          {/* Slider with +/- buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(Math.max(min, width - 1))}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Slider
              value={[width]}
              onValueChange={([value]) => onChange(value)}
              min={min}
              max={max}
              step={1}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(Math.min(max, width + 1))}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Presets */}
          <div className="flex gap-1">
            {PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={width === preset.value ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 text-xs px-1"
                onClick={() => onChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
