// Theme provider: holds the active palette/mode and persists the choice in SecureStore.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { themes, type Theme, type ThemeMode } from '../theme';

const STORE_KEY = 'logieat.theme';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((v) => { if (v === 'light' || v === 'dark') setModeState(v); })
      .catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const setMode = (m: ThemeMode) => {
      setModeState(m);
      SecureStore.setItemAsync(STORE_KEY, m).catch(() => {});
    };
    return {
      theme: themes[mode],
      mode,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemeMode() {
  const { mode, toggle, setMode } = useThemeContext();
  return { mode, toggle, setMode };
}
