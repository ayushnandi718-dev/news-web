"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  fontSize: number;
  setFontSize: (n: number) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  toggle: () => {},
  fontSize: 16,
  setFontSize: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("dk-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialFont(): number {
  if (typeof window === "undefined") return 16;
  const stored = localStorage.getItem("dk-font-size");
  const n = stored ? parseInt(stored, 10) : NaN;
  return Number.isFinite(n) && n >= 12 && n <= 24 ? n : 16;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitial);
  const [fontSize, setFont] = useState<number>(getInitialFont);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dk-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--dk-font-size", `${fontSize}px`);
    localStorage.setItem("dk-font-size", String(fontSize));
  }, [fontSize]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  const setFontSize = useCallback((n: number) => setFont(Math.min(24, Math.max(12, n))), []);

  return (
    <ThemeContext.Provider value={{ theme, toggle, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}
