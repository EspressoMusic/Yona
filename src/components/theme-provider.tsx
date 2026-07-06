"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "LIGHT" | "DARK" | "SYSTEM";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "LIGHT" | "DARK";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeClass(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "DARK" || (theme === "SYSTEM" && prefersDark);
  document.documentElement.classList.toggle("dark", isDark);
  return isDark ? "DARK" : "LIGHT";
}

export function ThemeProvider({
  initialTheme = "SYSTEM",
  children,
}: {
  initialTheme?: Theme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"LIGHT" | "DARK">("LIGHT");

  useEffect(() => {
    const stored = window.localStorage.getItem("sp-theme") as Theme | null;
    const initial = stored || initialTheme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with localStorage on mount
    setThemeState(initial);
    setResolvedTheme(applyThemeClass(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (theme !== "SYSTEM") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setResolvedTheme(applyThemeClass(theme));
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setResolvedTheme(applyThemeClass(next));
    window.localStorage.setItem("sp-theme", next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
