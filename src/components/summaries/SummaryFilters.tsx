import { motion } from 'framer-motion';
import { FileText, GraduationCap, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SummaryType } from '@/types/summary';

interface SummaryFiltersProps {
  activeFilter: SummaryType | 'all';
  onFilterChange: (filter: SummaryType | 'all') => void;
  counts: {
    all: number;
    essential: number;
    exam: number;
  };
}

export function SummaryFilters({ activeFilter, onFilterChange, counts }: SummaryFiltersProps) {
  const filters = [
    { 
      id: 'all' as const, 
      label: 'Todos', 
      icon: Layers, 
      count: counts.all 
    },
    { 
      id: 'essential' as const, 
      label: 'Essencial', 
      icon: FileText, 
      count: counts.essential 
    },
    { 
      id: 'exam' as const, 
      label: 'Prova', 
      icon: GraduationCap, 
      count: counts.exam 
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 flex-wrap"
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const Icon = filter.icon;
        
        return (
          <Button
            key={filter.id}
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className="gap-2"
          >
            <Icon className="w-4 h-4" />
            {filter.label}
            {filter.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive 
                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {filter.count}
              </span>
            )}
          </Button>
        );
      })}
    </motion.div>
  );
}
