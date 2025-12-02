import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PenStyle, PEN_STYLES } from '@/types/notebook';
import { PenTool, Circle, Paintbrush, ChevronDown } from 'lucide-react';

interface PenStyleSelectorProps {
  penStyle: PenStyle;
  onChange: (style: PenStyle) => void;
}

const PEN_ICONS: Record<PenStyle, React.ReactNode> = {
  fountain: <PenTool className="h-4 w-4" />,
  ballpoint: <Circle className="h-4 w-4" />,
  brush: <Paintbrush className="h-4 w-4" />,
};

export const PenStyleSelector = ({ penStyle, onChange }: PenStyleSelectorProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 px-2">
          {PEN_ICONS[penStyle]}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1">
          {(Object.keys(PEN_STYLES) as PenStyle[]).map((style) => {
            const config = PEN_STYLES[style];
            const isSelected = penStyle === style;
            
            return (
              <button
                key={style}
                className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onChange(style)}
              >
                <div className={`p-1.5 rounded ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                  {PEN_ICONS[style]}
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium">{config.name}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
