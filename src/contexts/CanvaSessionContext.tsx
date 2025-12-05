import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CanvaSession, CanvaIntegrationSettings, DEFAULT_CANVA_SETTINGS } from '@/types/canva';
import { Task } from '@/types/task';

interface CanvaSessionContextType {
  session: CanvaSession | null;
  settings: CanvaIntegrationSettings;
  startSession: (task: Task) => void;
  endSession: (completed?: boolean) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  linkDesign: (url: string, title?: string) => void;
  openCanvaPopout: (designUrl?: string) => Window | null;
  bringCanvaToFront: () => void;
  updateSettings: (settings: Partial<CanvaIntegrationSettings>) => void;
  isPopoutOpen: boolean;
}

const CanvaSessionContext = createContext<CanvaSessionContextType | undefined>(undefined);

const STORAGE_KEY = 'nomos.canva.session';
const SETTINGS_KEY = 'nomos.canva.settings';
const HISTORY_KEY = 'nomos.canva.history';

export function CanvaSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CanvaSession | null>(null);
  const [settings, setSettings] = useState<CanvaIntegrationSettings>(DEFAULT_CANVA_SETTINGS);
  const [isPopoutOpen, setIsPopoutOpen] = useState(false);
  const popoutRef = useRef<Window | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem(STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      // Restore session but mark popout as closed
      setSession({ ...parsed, popoutWindow: null });
    }
    
    if (savedSettings) {
      setSettings({ ...DEFAULT_CANVA_SETTINGS, ...JSON.parse(savedSettings) });
    }
  }, []);

  // Save session to localStorage
  useEffect(() => {
    if (session) {
      const { popoutWindow, ...sessionToSave } = session;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionToSave));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [session]);

  // Timer logic
  useEffect(() => {
    if (session?.isActive) {
      timerRef.current = setInterval(() => {
        setSession(prev => prev ? {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1
        } : null);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [session?.isActive]);

  // Monitor popout window
  useEffect(() => {
    const checkPopout = setInterval(() => {
      if (popoutRef.current && popoutRef.current.closed) {
        setIsPopoutOpen(false);
        popoutRef.current = null;
      }
    }, 1000);
    
    return () => clearInterval(checkPopout);
  }, []);

  const startSession = useCallback((task: Task) => {
    const newSession: CanvaSession = {
      taskId: task.id,
      taskText: task.text,
      designUrl: task.canvaDesignUrl,
      designTitle: task.canvaDesignTitle,
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      isActive: true,
    };
    setSession(newSession);
  }, []);

  const endSession = useCallback((completed = false) => {
    if (session) {
      // Save to history
      const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const existingIndex = history.findIndex((h: any) => h.taskId === session.taskId);
      
      const sessionRecord = {
        startedAt: session.startedAt,
        endedAt: new Date().toISOString(),
        duration: session.elapsedSeconds,
      };
      
      if (existingIndex >= 0) {
        history[existingIndex].totalTimeSpent += session.elapsedSeconds;
        history[existingIndex].sessions.push(sessionRecord);
        if (session.designUrl) {
          history[existingIndex].designUrl = session.designUrl;
        }
      } else {
        history.push({
          taskId: session.taskId,
          taskText: session.taskText,
          designUrl: session.designUrl,
          totalTimeSpent: session.elapsedSeconds,
          sessions: [sessionRecord],
        });
      }
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    
    // Close popout if open
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.close();
    }
    
    setSession(null);
    setIsPopoutOpen(false);
    popoutRef.current = null;
  }, [session]);

  const pauseSession = useCallback(() => {
    setSession(prev => prev ? { ...prev, isActive: false } : null);
  }, []);

  const resumeSession = useCallback(() => {
    setSession(prev => prev ? { ...prev, isActive: true } : null);
  }, []);

  const linkDesign = useCallback((url: string, title?: string) => {
    setSession(prev => prev ? {
      ...prev,
      designUrl: url,
      designTitle: title || 'Design Canva',
    } : null);
  }, []);

  const openCanvaPopout = useCallback((designUrl?: string) => {
    const url = designUrl || 'https://www.canva.com';
    
    // Calculate position: right side of screen
    const width = Math.min(1200, window.screen.width * 0.6);
    const height = window.screen.height - 100;
    const left = window.screen.width - width - 50;
    const top = 50;
    
    const popup = window.open(
      url,
      'canva_popout',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    if (popup) {
      popoutRef.current = popup;
      setIsPopoutOpen(true);
      popup.focus();
    }
    
    return popup;
  }, []);

  const bringCanvaToFront = useCallback(() => {
    if (popoutRef.current && !popoutRef.current.closed) {
      popoutRef.current.focus();
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<CanvaIntegrationSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <CanvaSessionContext.Provider
      value={{
        session,
        settings,
        startSession,
        endSession,
        pauseSession,
        resumeSession,
        linkDesign,
        openCanvaPopout,
        bringCanvaToFront,
        updateSettings,
        isPopoutOpen,
      }}
    >
      {children}
    </CanvaSessionContext.Provider>
  );
}

export function useCanvaSession() {
  const context = useContext(CanvaSessionContext);
  if (!context) {
    throw new Error('useCanvaSession must be used within CanvaSessionProvider');
  }
  return context;
}
