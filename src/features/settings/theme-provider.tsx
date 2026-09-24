"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { resolveTheme, type Theme } from "@/features/settings/theme";

export { resolveTheme } from "@/features/settings/theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    let active = true;
    void import("@/features/storage/repositories").then(
      ({ settingsRepository }) =>
        settingsRepository.get().then((settings) => {
          if (active) setTheme(settings.theme);
        }),
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(
        theme,
        media.matches,
      );
      document.documentElement.style.colorScheme = resolveTheme(
        theme,
        media.matches,
      );
    };
    apply();
    if (theme !== "system") return;
    const listener = () => apply();
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value)
    throw new Error("useTheme harus digunakan di dalam ThemeProvider");
  return value;
}
