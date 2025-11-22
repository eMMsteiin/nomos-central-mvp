import { useContext } from 'react';
import { HiddenTabsContext } from '@/contexts/HiddenTabsContext';

export const useHiddenTabs = () => {
  const context = useContext(HiddenTabsContext);
  
  if (!context) {
    throw new Error('useHiddenTabs must be used within HiddenTabsProvider');
  }
  
  return context;
};

export type { HiddenTab } from '@/contexts/HiddenTabsContext';
