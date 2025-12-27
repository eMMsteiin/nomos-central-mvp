import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ExternalTool } from '@/types/externalTool';
import { toast } from 'sonner';
import { isKnownBlockedSite } from '@/utils/externalToolsEmbed';

interface ExternalToolsContextType {
  userTools: ExternalTool[];
  addTool: (tool: Omit<ExternalTool, 'id' | 'order'>) => void;
  removeTool: (id: string) => void;
  updateTool: (id: string, updates: Partial<Omit<ExternalTool, 'id'>>) => void;
  reorderTools: (ids: string[]) => void;
  
  // Tab management
  openTabs: ExternalTool[];
  activeTabId: string | null;
  openAsTab: (tool: ExternalTool) => void;
  closeTab: (toolId: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (toolId: string | null) => void;
  
  // Popout management (deprecated but kept for compatibility)
  openAsPopout: (tool: ExternalTool) => Window | null;
  activePopouts: Map<string, Window>;
}

const GLOBAL_CONTEXT_KEY = '__nomosExternalToolsContext';

// HMR-safe context instance (prevents provider/consumer mismatch during fast refresh)
const ExternalToolsContext =
  ((globalThis as any)[GLOBAL_CONTEXT_KEY] as ReturnType<typeof createContext<ExternalToolsContextType | undefined>> | undefined) ??
  createContext<ExternalToolsContextType | undefined>(undefined);

(globalThis as any)[GLOBAL_CONTEXT_KEY] = ExternalToolsContext;
const STORAGE_KEY = 'nomos-external-tools';

export function ExternalToolsProvider({ children }: { children: React.ReactNode }) {
  const [userTools, setUserTools] = useState<ExternalTool[]>([]);
  const [activePopouts, setActivePopouts] = useState<Map<string, Window>>(new Map());
  
  // Tab state
  const [openTabs, setOpenTabs] = useState<ExternalTool[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Load from localStorage on mount and auto-correct blocked sites
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ExternalTool[];
        // Auto-correct: force canEmbed=false for known blocked sites
        const normalized = parsed.map(tool => ({
          ...tool,
          canEmbed: isKnownBlockedSite(tool.url) ? false : tool.canEmbed,
        }));
        setUserTools(normalized);
      } catch (e) {
        console.error('Error parsing external tools from localStorage:', e);
      }
    }
  }, []);

  // Save to localStorage when tools change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userTools));
  }, [userTools]);

  const addTool = useCallback((tool: Omit<ExternalTool, 'id' | 'order'>) => {
    const newTool: ExternalTool = {
      ...tool,
      id: `tool-${Date.now()}`,
      order: userTools.length,
      canEmbed: tool.canEmbed ?? true, // Default para true (ferramentas personalizadas tentam iframe)
    };
    setUserTools(prev => [...prev, newTool]);
  }, [userTools.length]);

  const removeTool = useCallback((id: string) => {
    setUserTools(prev => prev.filter(t => t.id !== id).map((t, i) => ({ ...t, order: i })));
    
    // Close tab if open
    setOpenTabs(prev => prev.filter(t => t.id !== id));
    if (activeTabId === id) {
      setActiveTabId(null);
    }
    
    // Close popout if open
    const popout = activePopouts.get(id);
    if (popout && !popout.closed) {
      popout.close();
    }
    setActivePopouts(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, [activePopouts, activeTabId]);

  const updateTool = useCallback((id: string, updates: Partial<Omit<ExternalTool, 'id'>>) => {
    setUserTools(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    // Also update in openTabs if present
    setOpenTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const reorderTools = useCallback((ids: string[]) => {
    setUserTools(prev => {
      const toolMap = new Map(prev.map(t => [t.id, t]));
      return ids.map((id, index) => {
        const tool = toolMap.get(id);
        if (!tool) return null;
        return { ...tool, order: index };
      }).filter(Boolean) as ExternalTool[];
    });
  }, []);

  // Tab management
  const openAsTab = useCallback((tool: ExternalTool) => {
    setOpenTabs(prev => {
      // If already open, just activate it
      if (prev.some(t => t.id === tool.id)) {
        return prev;
      }
      return [...prev, tool];
    });
    setActiveTabId(tool.id);
  }, []);

  const closeTab = useCallback((toolId: string) => {
    setOpenTabs(prev => prev.filter(t => t.id !== toolId));
    if (activeTabId === toolId) {
      // Switch to another tab or close
      setOpenTabs(prev => {
        const remaining = prev.filter(t => t.id !== toolId);
        if (remaining.length > 0) {
          setActiveTabId(remaining[remaining.length - 1].id);
        } else {
          setActiveTabId(null);
        }
        return remaining;
      });
    }
  }, [activeTabId]);

  const closeAllTabs = useCallback(() => {
    setOpenTabs([]);
    setActiveTabId(null);
  }, []);

  const setActiveTab = useCallback((toolId: string | null) => {
    setActiveTabId(toolId);
  }, []);

  // Popout management
  const openAsPopout = useCallback((tool: ExternalTool): Window | null => {
    // Check if already open
    const existing = activePopouts.get(tool.id);
    if (existing && !existing.closed) {
      existing.focus();
      return existing;
    }

    // Calculate pop-out dimensions and position
    const width = Math.min(1200, window.screen.width * 0.6);
    const height = window.screen.height - 100;
    const left = window.screen.width - width - 50;
    const top = 50;

    const popout = window.open(
      tool.url,
      `external_tool_${tool.id}`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popout) {
      // Popup was blocked by the browser
      toast.error(`${tool.name} foi bloqueado pelo navegador`, {
        description: 'Permita pop-ups ou clique com o botão direito para abrir em nova aba.',
        action: {
          label: 'Abrir em nova aba',
          onClick: () => window.open(tool.url, '_blank', 'noopener,noreferrer'),
        },
      });
      return null;
    }

    setActivePopouts(prev => {
      const next = new Map(prev);
      next.set(tool.id, popout);
      return next;
    });

    // Clean up when window closes
    const checkClosed = setInterval(() => {
      if (popout.closed) {
        clearInterval(checkClosed);
        setActivePopouts(prev => {
          const next = new Map(prev);
          next.delete(tool.id);
          return next;
        });
      }
    }, 1000);

    return popout;
  }, [activePopouts]);

  return (
    <ExternalToolsContext.Provider value={{
      userTools,
      addTool,
      removeTool,
      updateTool,
      reorderTools,
      openTabs,
      activeTabId,
      openAsTab,
      closeTab,
      closeAllTabs,
      setActiveTab,
      openAsPopout,
      activePopouts,
    }}>
      {children}
    </ExternalToolsContext.Provider>
  );
}

export function useExternalTools(): ExternalToolsContextType {
  const context = useContext(ExternalToolsContext);

  if (context === undefined) {
    // In rare cases (usually HMR/fast-refresh), the provider/consumer can temporarily desync.
    // Avoid a hard crash and trigger a one-time reload to resync.
    const g = globalThis as any;
    if (!g.__nomos_external_tools_ctx_reload_scheduled) {
      g.__nomos_external_tools_ctx_reload_scheduled = true;
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          // ignore
        }
      }, 50);
    }

    return {
      userTools: [],
      addTool: () => {},
      removeTool: () => {},
      updateTool: () => {},
      reorderTools: () => {},
      openTabs: [],
      activeTabId: null,
      openAsTab: () => {},
      closeTab: () => {},
      closeAllTabs: () => {},
      setActiveTab: () => {},
      openAsPopout: () => null,
      activePopouts: new Map(),
    };
  }

  return context;
}
