import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  Globe,
  Instagram,
  Music2,
  Youtube,
  Twitter,
  Facebook,
  MessageSquare,
  Twitch,
  Image,
  MessageCircle,
  Film,
  Play,
  Music,
  Video,
  Laugh,
  Linkedin,
  AtSign,
  Ghost,
  Phone,
  Send,
  Tv,
  Sparkles,
  PenSquare,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  FOCUS_APPS_TOP8, 
  FOCUS_APPS_ALL, 
  TOP8_DOMAINS,
  type FocusApp 
} from '@/data/focusCatalog';

interface AppIconPickerProps {
  selectedDomains: string[];
  onChange: (domains: string[]) => void;
  disabled?: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  Instagram,
  Music2,
  Youtube,
  Twitter,
  Facebook,
  MessageSquare,
  Twitch,
  Image,
  MessageCircle,
  Film,
  Play,
  Music,
  Video,
  Laugh,
  Linkedin,
  AtSign,
  Ghost,
  Phone,
  Send,
  Tv,
  Sparkles,
  PenSquare,
  Globe,
};

const getIcon = (iconKey: string): LucideIcon => {
  return iconMap[iconKey] || Globe;
};

interface AppCardProps {
  app: FocusApp;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function AppCard({ app, selected, disabled, onToggle }: AppCardProps) {
  const Icon = getIcon(app.iconKey);
  
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-center justify-center gap-1 p-2 rounded-sm border transition-colors",
        "min-w-[60px] min-h-[56px]",
        "focus:outline-none focus:ring-1 focus:ring-foreground",
        selected 
          ? "border-foreground bg-foreground/5" 
          : "border-border hover:border-muted-foreground",
        disabled && "opacity-50 cursor-not-allowed hover:border-border"
      )}
    >
      <Icon className={cn("h-4 w-4", selected ? "text-foreground" : "text-muted-foreground")} />
      <span className={cn(
        "text-[10px] truncate max-w-full",
        selected ? "text-foreground font-medium" : "text-muted-foreground"
      )}>
        {app.label}
      </span>
    </button>
  );
}

export function AppIconPicker({
  selectedDomains,
  onChange,
  disabled = false,
}: AppIconPickerProps) {
  const [expanded, setExpanded] = useState(false);
  
  const selectedFromCatalog = FOCUS_APPS_ALL.filter(app => 
    selectedDomains.includes(app.domain)
  ).length;
  
  const handleToggle = (domain: string) => {
    if (disabled) return;
    
    if (selectedDomains.includes(domain)) {
      onChange(selectedDomains.filter(d => d !== domain));
    } else {
      onChange([...selectedDomains, domain]);
    }
  };
  
  const handleSelectPopular = () => {
    if (disabled) return;
    
    const customDomains = selectedDomains.filter(
      d => !FOCUS_APPS_ALL.some(app => app.domain === d)
    );
    const newSelection = [...new Set([...customDomains, ...TOP8_DOMAINS])];
    onChange(newSelection);
  };
  
  const handleClearSelection = () => {
    if (disabled) return;
    
    const customDomains = selectedDomains.filter(
      d => !FOCUS_APPS_ALL.some(app => app.domain === d)
    );
    onChange(customDomains);
  };
  
  const isSelected = (domain: string) => selectedDomains.includes(domain);
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {selectedFromCatalog} selecionados
        </span>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectPopular}
            disabled={disabled}
            className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Selecionar populares
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={disabled || selectedFromCatalog === 0}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Top 8 */}
      <div className="grid grid-cols-4 gap-1.5">
        {FOCUS_APPS_TOP8.map((app) => (
          <AppCard
            key={app.id}
            app={app}
            selected={isSelected(app.domain)}
            disabled={disabled}
            onToggle={() => handleToggle(app.domain)}
          />
        ))}
      </div>
      
      {/* Expand Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full h-7 gap-1 text-xs text-muted-foreground"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" />
            Menos
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" />
            Mais
          </>
        )}
      </Button>
      
      {/* Extended Apps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-1.5">
              {FOCUS_APPS_ALL.filter(
                app => !FOCUS_APPS_TOP8.some(top => top.id === app.id)
              ).map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  selected={isSelected(app.domain)}
                  disabled={disabled}
                  onToggle={() => handleToggle(app.domain)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
