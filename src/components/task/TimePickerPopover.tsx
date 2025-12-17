import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface TimePickerPopoverProps {
  value?: string;
  onChange: (time: string | undefined) => void;
}

export function TimePickerPopover({ value, onChange }: TimePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(value?.split(':')[0] || '');
  const [minutes, setMinutes] = useState(value?.split(':')[1] || '');

  const handleConfirm = () => {
    if (hours && minutes) {
      const h = hours.padStart(2, '0');
      const m = minutes.padStart(2, '0');
      onChange(`${h}:${m}`);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setHours('');
    setMinutes('');
    onChange(undefined);
    setOpen(false);
  };

  const handleHoursChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 23)) {
      setHours(num);
    }
  };

  const handleMinutesChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    if (num === '' || (parseInt(num) >= 0 && parseInt(num) <= 59)) {
      setMinutes(num);
    }
  };

  const hasValue = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 h-8 w-8 relative ${hasValue ? 'text-primary' : 'text-muted-foreground'}`}
          aria-label="Definir horário"
        >
          <Clock className="h-4 w-4" />
          {hasValue && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Horário</p>
          
          <div className="flex items-center justify-center gap-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="HH"
              value={hours}
              onChange={(e) => handleHoursChange(e.target.value)}
              className="w-14 text-center"
              maxLength={2}
            />
            <span className="text-lg font-bold text-muted-foreground">:</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="MM"
              value={minutes}
              onChange={(e) => handleMinutesChange(e.target.value)}
              className="w-14 text-center"
              maxLength={2}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="flex-1 text-xs"
            >
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!hours || !minutes}
              className="flex-1 text-xs"
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
