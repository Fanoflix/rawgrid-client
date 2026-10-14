import { useCallback, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "theme";

type ThemeListener = () => void;

const listeners = new Set<ThemeListener>();
let isDarkTheme = readStoredTheme();

function readStoredTheme() {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return stored === "dark";
  } catch {
    return true;
  }
  return true;
}

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    return;
  }
}

function setDarkTheme(isDark: boolean) {
  if (isDark === isDarkTheme) return;
  isDarkTheme = isDark;
  applyTheme(isDark);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: ThemeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return isDarkTheme;
}

if (typeof document !== "undefined") applyTheme(isDarkTheme);

export function useThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggleTheme = useCallback(() => setDarkTheme(!isDarkTheme), []);
  const setTheme = useCallback((nextIsDark: boolean) => setDarkTheme(nextIsDark), []);

  return { isDark, toggleTheme, setTheme };
}
