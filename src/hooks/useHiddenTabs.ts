import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export interface HiddenTab {
  url: string;
  title: string;
  hiddenAt: string;
}

const STORAGE_KEY = 'nomos-hidden-tabs';

export const useHiddenTabs = () => {
  const [hiddenTabs, setHiddenTabs] = useState<HiddenTab[]>([]);

  // Load hidden tabs from localStorage
  const loadHiddenTabs = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHiddenTabs(parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Error loading hidden tabs:', error);
    }
    return [];
  };

  // Save hidden tabs to localStorage
  const saveHiddenTabs = (tabs: HiddenTab[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
      setHiddenTabs(tabs);
    } catch (error) {
      console.error('Error saving hidden tabs:', error);
    }
  };

  // Hide a tab
  const hideTab = (url: string, title: string) => {
    const newTab: HiddenTab = {
      url,
      title,
      hiddenAt: new Date().toISOString(),
    };
    const updated = [...hiddenTabs, newTab];
    saveHiddenTabs(updated);
    
    toast({
      title: "Aba ocultada",
      description: `"${title}" foi ocultada. Acesse Ferramentas para desocultar.`,
    });
  };

  // Unhide a tab
  const unhideTab = (url: string) => {
    const tab = hiddenTabs.find(t => t.url === url);
    const updated = hiddenTabs.filter(t => t.url !== url);
    saveHiddenTabs(updated);
    
    if (tab) {
      toast({
        title: "Aba desocultada",
        description: `"${tab.title}" foi desocultada com sucesso.`,
      });
    }
  };

  // Check if a tab is hidden
  const isTabHidden = (url: string) => {
    return hiddenTabs.some(t => t.url === url);
  };

  // Get all hidden tabs
  const getHiddenTabs = () => {
    return hiddenTabs;
  };

  // Load on mount
  useEffect(() => {
    loadHiddenTabs();
  }, []);

  return {
    hiddenTabs,
    hideTab,
    unhideTab,
    isTabHidden,
    getHiddenTabs,
  };
};
