import { createContext, useState, useEffect, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

export interface HiddenTab {
  url: string;
  title: string;
  hiddenAt: string;
}

interface HiddenTabsContextType {
  hiddenTabs: HiddenTab[];
  hideTab: (url: string, title: string) => void;
  unhideTab: (url: string) => void;
  isTabHidden: (url: string) => boolean;
  getHiddenTabs: () => HiddenTab[];
}

const STORAGE_KEY = 'nomos-hidden-tabs';

export const HiddenTabsContext = createContext<HiddenTabsContextType | undefined>(undefined);

interface HiddenTabsProviderProps {
  children: ReactNode;
}

export const HiddenTabsProvider = ({ children }: HiddenTabsProviderProps) => {
  const [hiddenTabs, setHiddenTabs] = useState<HiddenTab[]>([]);

  // Load hidden tabs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHiddenTabs(parsed);
      }
    } catch (error) {
      console.error('Error loading hidden tabs:', error);
    }
  }, []);

  // Save to localStorage whenever hiddenTabs changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenTabs));
    } catch (error) {
      console.error('Error saving hidden tabs:', error);
    }
  }, [hiddenTabs]);

  const hideTab = (url: string, title: string) => {
    const newTab: HiddenTab = {
      url,
      title,
      hiddenAt: new Date().toISOString(),
    };
    setHiddenTabs(prev => [...prev, newTab]);
    
    toast({
      title: "Aba ocultada",
      description: `"${title}" foi ocultada. Acesse Ferramentas para desocultar.`,
    });
  };

  const unhideTab = (url: string) => {
    const tab = hiddenTabs.find(t => t.url === url);
    setHiddenTabs(prev => prev.filter(t => t.url !== url));
    
    if (tab) {
      toast({
        title: "Aba desocultada",
        description: `"${tab.title}" foi desocultada com sucesso.`,
      });
    }
  };

  const isTabHidden = (url: string) => {
    return hiddenTabs.some(t => t.url === url);
  };

  const getHiddenTabs = () => {
    return hiddenTabs;
  };

  return (
    <HiddenTabsContext.Provider value={{ hiddenTabs, hideTab, unhideTab, isTabHidden, getHiddenTabs }}>
      {children}
    </HiddenTabsContext.Provider>
  );
};
