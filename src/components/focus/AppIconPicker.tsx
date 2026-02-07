import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
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
import { Badge } from '@/components/ui/badge';
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

// Map of icon keys to actual icon components
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

// Helper to get lucide icon by key
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
        "flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg border-2 transition-all",
        "min-w-[72px] min-h-[72px]",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        selected 
          ? "border-primary bg-primary/10 text-primary" 
          : "border-border bg-card hover:border-muted-foreground/50 hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card"
      )}
    >
      <Icon className={cn("h-6 w-6", selected ? "text-primary" : "text-muted-foreground")} />
      <span className={cn(
        "text-xs font-medium truncate max-w-full",
        selected ? "text-primary" : "text-muted-foreground"
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
  
  // Count selected from catalog only
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
    
    // Add all top 8 domains, keeping any existing custom domains
    const customDomains = selectedDomains.filter(
      d => !FOCUS_APPS_ALL.some(app => app.domain === d)
    );
    const newSelection = [...new Set([...customDomains, ...TOP8_DOMAINS])];
    onChange(newSelection);
  };
  
  const handleClearSelection = () => {
    if (disabled) return;
    
    // Keep only custom domains that are not in the catalog
    const customDomains = selectedDomains.filter(
      d => !FOCUS_APPS_ALL.some(app => app.domain === d)
    );
    onChange(customDomains);
  };
  
  const isSelected = (domain: string) => selectedDomains.includes(domain);
  
  return (
    <div className="space-y-4">
      {/* Header with count and actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="secondary" className="text-sm">
          Selecionados: {selectedFromCatalog}
        </Badge>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectPopular}
            disabled={disabled}
            className="gap-1.5 text-xs"
          >
            <Zap className="h-3.5 w-3.5" />
            Selecionar populares
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={disabled || selectedFromCatalog === 0}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
      </div>
      
      {/* Top 8 Section */}
      <div>
        <p className="text-sm text-muted-foreground mb-2">Mais usados</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
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
      </div>
      
      {/* Expand/Collapse Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full gap-2 text-muted-foreground"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-4 w-4" />
            Mostrar menos
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4" />
            Ver mais apps
          </>
        )}
      </Button>
      
      {/* Extended Apps Section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 pt-2">
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
