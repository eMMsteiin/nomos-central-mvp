import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseDomain } from '@/hooks/useFocusMode';
import { toast } from 'sonner';

interface DomainListEditorProps {
  domains: string[];
  onChange: (domains: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function DomainListEditor({
  domains,
  onChange,
  placeholder = 'Digite um domínio (ex: instagram.com)',
  emptyMessage = 'Nenhum site adicionado',
  disabled = false,
}: DomainListEditorProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const parsed = parseDomain(inputValue);
    
    if (!parsed) {
      toast.error('Domínio inválido', {
        description: 'Digite um domínio válido (ex: instagram.com)',
      });
      return;
    }
    
    if (domains.includes(parsed)) {
      toast.info('Esse site já está na lista');
      setInputValue('');
      return;
    }
    
    onChange([...domains, parsed]);
    setInputValue('');
  };

  const handleRemove = (domain: string) => {
    onChange(domains.filter(d => d !== domain));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button 
          onClick={handleAdd} 
          size="icon" 
          variant="outline"
          disabled={disabled || !inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {domains.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <Badge 
              key={domain} 
              variant="secondary" 
              className="gap-1 pr-1"
            >
              {domain}
              {!disabled && (
                <button
                  onClick={() => handleRemove(domain)}
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                  aria-label={`Remover ${domain}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
