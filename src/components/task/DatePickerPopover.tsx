import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DatePickerPopoverProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
}

export function DatePickerPopover({ value, onChange }: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(value ? String(value.getDate()) : '');
  const [month, setMonth] = useState(value ? String(value.getMonth() + 1) : '');

  const handleQuickSelect = (date: Date) => {
    onChange(date);
    setDay(String(date.getDate()));
    setMonth(String(date.getMonth() + 1));
    setOpen(false);
  };

  const handleConfirm = () => {
    if (day && month) {
      const d = parseInt(day);
      const m = parseInt(month) - 1;
      const year = new Date().getFullYear();
      const date = new Date(year, m, d);
      
      // Se a data já passou este ano, usa o próximo ano
      if (date < new Date()) {
        date.setFullYear(year + 1);
      }
      
      onChange(date);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setDay('');
    setMonth('');
    onChange(undefined);
    setOpen(false);
  };

  const handleDayChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 31)) {
      setDay(num);
    }
  };

  const handleMonthChange = (val: string) => {
    const num = val.replace(/\D/g, '').slice(0, 2);
    if (num === '' || (parseInt(num) >= 1 && parseInt(num) <= 12)) {
      setMonth(num);
    }
  };

  const hasValue = !!value;
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 h-8 w-8 relative ${hasValue ? 'text-primary' : 'text-muted-foreground'}`}
          aria-label="Definir data"
        >
          <CalendarDays className="h-4 w-4" />
          {hasValue && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <div className="space-y-3">
          <p className="text-sm font-medium">Data</p>
          
          {/* Quick options */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(today)}
              className="text-xs h-7 px-2"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(tomorrow)}
              className="text-xs h-7 px-2"
            >
              Amanhã
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(nextWeek)}
              className="text-xs h-7 px-2"
            >
              Próx. semana
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            <span>ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Manual input */}
          <div className="flex items-center justify-center gap-1">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="DD"
              value={day}
              onChange={(e) => handleDayChange(e.target.value)}
              className="w-14 text-center"
              maxLength={2}
            />
            <span className="text-lg font-bold text-muted-foreground">/</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="MM"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
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
              disabled={!day || !month}
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
