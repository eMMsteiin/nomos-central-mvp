import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY, THEMES, ThemeTemplate, getTheme } from "@/themes";

interface ThemeContextType {
  theme: ThemeTemplate;
  themes: ThemeTemplate[];
  setTheme: (id: string) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function readStoredThemeId(): string {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && THEMES.some((t) => t.id === stored)) return stored;
  } catch {
    // localStorage indisponível: usa o padrão
  }
  return DEFAULT_THEME_ID;
}

function applyTheme(theme: ThemeTemplate) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.id);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", theme.themeColor));
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState<string>(readStoredThemeId);
  const theme = getTheme(themeId);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((id: string) => {
    const next = getTheme(id);
    setThemeId(next.id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next.id);
    } catch {
      // sem persistência, mas o tema vale para esta sessão
    }
  }, []);

  const value = useMemo(() => ({ theme, themes: THEMES, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
