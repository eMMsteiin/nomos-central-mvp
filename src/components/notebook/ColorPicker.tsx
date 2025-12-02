import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COLOR_PALETTE, ALL_COLORS, HIGHLIGHTER_COLORS } from '@/types/notebook';
import { Palette, Plus } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  isHighlighter?: boolean;
}

export const ColorPicker = ({ color, onChange, isHighlighter = false }: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState(color);
  const [recentColors, setRecentColors] = useState<string[]>([]);

  const colors = isHighlighter ? HIGHLIGHTER_COLORS : ALL_COLORS;

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor);
  };

  const handleCustomColorApply = () => {
    onChange(customColor);
    // Add to recent colors if not already present
    if (!recentColors.includes(customColor) && !colors.includes(customColor)) {
      setRecentColors(prev => [customColor, ...prev].slice(0, 4));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 px-2">
          <div
            className="w-5 h-5 rounded-full border border-border shadow-inner"
            style={{ backgroundColor: color }}
          />
          <Palette className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Main Colors Grid */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              {isHighlighter ? 'Cores do Marca-texto' : 'Cores'}
            </Label>
            <div className="grid grid-cols-8 gap-1">
              {colors.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                    color === c ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => onChange(c)}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Recentes</Label>
              <div className="flex gap-1">
                {recentColors.map((c) => (
                  <button
                    key={c}
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${
                      color === c ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => onChange(c)}
                    title={c}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Color Picker */}
          {!isHighlighter && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Cor Personalizada</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                />
                <Input
                  value={customColor}
                  onChange={(e) => handleCustomColorChange(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 h-8 text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCustomColorApply}
                  className="h-8 px-2"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
