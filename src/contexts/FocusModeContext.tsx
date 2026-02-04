import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { FocusState, DEFAULT_FOCUS_STATE, FOCUS_STORAGE_KEY, FocusEvent } from "@/types/focusMode";
import { toast } from "sonner";

interface FocusModeContextType {
  state: FocusState;
  remainingMs: number;
  startSession: (durationMin: number) => void;
  endSession: (reason: "completed" | "ended_early") => void;
  updateBlocklist: (blocklist: string[]) => void;
  updateAllowlist: (allowlist: string[]) => void;
  setDefaultDuration: (durationMin: number) => void;
}

const FocusModeContext = createContext<FocusModeContextType | undefined>(undefined);

// Helper to emit events for future Chrome extension
const emitFocusEvent = (type: FocusEvent["type"], payload: FocusEvent["payload"]) => {
  const event: FocusEvent = {
    source: "NOMOS",
    type,
    payload,
  };
  window.postMessage(event, "*");
};

// Load state from localStorage with expiration check
const loadState = (): FocusState => {
  try {
    const saved = localStorage.getItem(FOCUS_STORAGE_KEY);
    if (!saved) return DEFAULT_FOCUS_STATE;

    const state: FocusState = JSON.parse(saved);

    // Check if session expired while away
    if (state.active && state.until) {
      if (Date.now() >= state.until) {
        return {
          ...state,
          active: false,
          startedAt: null,
          until: null,
          lastEndReason: "completed",
        };
      }
    }

    return state;
  } catch {
    return DEFAULT_FOCUS_STATE;
  }
};

// Save state to localStorage
const saveState = (state: FocusState) => {
  try {
    localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save focus state:", error);
  }
};

export function FocusModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FocusState>(loadState);
  const [remainingMs, setRemainingMs] = useState(0);

  // Timer effect
  useEffect(() => {
    if (!state.active || !state.until) {
      setRemainingMs(0);
      return;
    }

    // Initial calculation
    const initialRemaining = state.until - Date.now();
    setRemainingMs(Math.max(0, initialRemaining));

    const interval = setInterval(() => {
      const remaining = state.until! - Date.now();

      if (remaining <= 0) {
        // Session completed
        const newState: FocusState = {
          ...state,
          active: false,
          startedAt: null,
          until: null,
          lastEndReason: "completed",
        };
        setState(newState);
        saveState(newState);
        setRemainingMs(0);

        emitFocusEvent("NOMOS_FOCUS_STOP", {
          active: false,
          until: null,
          blocklist: newState.blocklist,
          allowlist: newState.allowlist,
          reason: "completed",
        });
        emitFocusEvent("NOMOS_FOCUS_UPDATE", {
          active: false,
          until: null,
          blocklist: newState.blocklist,
          allowlist: newState.allowlist,
        });

        toast.success("Sessão concluída. Boa! 🎉");

        clearInterval(interval);
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [state.active, state.until]);

  // beforeunload warning when session is active
  useEffect(() => {
    if (!state.active || !state.until) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const endTime = new Date(state.until!).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      e.preventDefault();
      e.returnValue = `Sessão de foco ativa até ${endTime}`;
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state.active, state.until]);

  const startSession = useCallback(
    (durationMin: number) => {
      const now = Date.now();
      const until = now + durationMin * 60 * 1000;

      const newState: FocusState = {
        ...state,
        active: true,
        startedAt: now,
        until,
        durationMin,
        lastEndReason: null,
      };

      setState(newState);
      saveState(newState);
      setRemainingMs(durationMin * 60 * 1000);

      emitFocusEvent("NOMOS_FOCUS_START", {
        active: true,
        until,
        blocklist: newState.blocklist,
        allowlist: newState.allowlist,
      });

      const endTime = new Date(until).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.success(`Você escolheu foco por ${durationMin} min`, {
        description: `Termina às ${endTime}`,
      });
    },
    [state],
  );

  const endSession = useCallback(
    (reason: "completed" | "ended_early") => {
      const newState: FocusState = {
        ...state,
        active: false,
        startedAt: null,
        until: null,
        lastEndReason: reason,
      };

      setState(newState);
      saveState(newState);
      setRemainingMs(0);

      emitFocusEvent("NOMOS_FOCUS_STOP", { reason });

      if (reason === "ended_early") {
        toast.info("Tudo bem ajustar. Quer reiniciar com uma sessão menor?");
      }
    },
    [state],
  );

  const updateBlocklist = useCallback(
    (blocklist: string[]) => {
      const newState: FocusState = { ...state, blocklist };
      setState(newState);
      saveState(newState);

      if (state.active) {
        emitFocusEvent("NOMOS_FOCUS_UPDATE", { blocklist });
      }
    },
    [state],
  );

  const updateAllowlist = useCallback(
    (allowlist: string[]) => {
      const newState: FocusState = { ...state, allowlist };
      setState(newState);
      saveState(newState);

      if (state.active) {
        emitFocusEvent("NOMOS_FOCUS_UPDATE", { allowlist });
      }
    },
    [state],
  );

  const setDefaultDuration = useCallback(
    (durationMin: number) => {
      const newState: FocusState = { ...state, durationMin };
      setState(newState);
      saveState(newState);
    },
    [state],
  );

  return (
    <FocusModeContext.Provider
      value={{
        state,
        remainingMs,
        startSession,
        endSession,
        updateBlocklist,
        updateAllowlist,
        setDefaultDuration,
      }}
    >
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusModeContext() {
  const context = useContext(FocusModeContext);
  if (context === undefined) {
    throw new Error("useFocusModeContext must be used within a FocusModeProvider");
  }
  return context;
}
