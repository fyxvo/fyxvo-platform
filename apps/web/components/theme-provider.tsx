"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from "react";

type Theme = "fyxvo-dark" | "fyxvo-light";

interface ThemeContextValue {
  readonly theme: Theme;
  readonly resolvedTheme: Theme;
  setTheme(theme: Theme): void;
  toggleTheme(): void;
}

const STORAGE_KEY = "fyxvo.web.theme";
const THEME_EVENT = "fyxvo:theme-change";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };
  const handleThemeChange = () => onStoreChange();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_EVENT, handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_EVENT, handleThemeChange);
  };
}

function readStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return storedTheme === "fyxvo-light" || storedTheme === "fyxvo-dark" ? storedTheme : defaultTheme;
}

export function ThemeProvider({
  children,
  defaultTheme = "fyxvo-dark"
}: PropsWithChildren<{
  readonly defaultTheme?: Theme;
}>) {
  const theme = useSyncExternalStore(
    subscribe,
    () => readStoredTheme(defaultTheme),
    () => defaultTheme
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme(nextTheme) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, nextTheme);
          window.dispatchEvent(new Event(THEME_EVENT));
        }
        applyTheme(nextTheme);
      },
      toggleTheme() {
        const nextTheme = theme === "fyxvo-dark" ? "fyxvo-light" : "fyxvo-dark";
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, nextTheme);
          window.dispatchEvent(new Event(THEME_EVENT));
        }
        applyTheme(nextTheme);
      }
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
