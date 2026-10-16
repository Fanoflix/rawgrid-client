import { useCallback, useSyncExternalStore } from "react";

import {
  CUSTOM_THEME_STORAGE,
  EMPTY_CUSTOM_THEME,
  customThemeCss,
  parseStoredCustomTheme,
  withoutDefaults,
  type CustomTheme,
  type FontSlot,
  type ThemeColorKey,
  type ThemeMode,
} from "@/lib/custom-theme";

type CustomThemeListener = () => void;

const listeners = new Set<CustomThemeListener>();
let customTheme = readStoredTheme();

function readStoredTheme() {
  if (typeof window === "undefined") return EMPTY_CUSTOM_THEME;
  try {
    return parseStoredCustomTheme(
      window.localStorage.getItem(CUSTOM_THEME_STORAGE.themeKey)
    );
  } catch {
    return EMPTY_CUSTOM_THEME;
  }
}

function styleElement() {
  const existing = document.getElementById(CUSTOM_THEME_STORAGE.styleElementId);
  if (existing) return existing;
  const created = document.createElement("style");
  created.id = CUSTOM_THEME_STORAGE.styleElementId;
  document.head.appendChild(created);
  return created;
}

function applyTheme(theme: CustomTheme) {
  const css = customThemeCss(theme);
  styleElement().textContent = css;
  try {
    window.localStorage.setItem(CUSTOM_THEME_STORAGE.themeKey, JSON.stringify(theme));
    window.localStorage.setItem(CUSTOM_THEME_STORAGE.cssKey, css);
  } catch {
    return;
  }
}

function setCustomTheme(theme: CustomTheme) {
  const clean = withoutDefaults(theme);
  if (JSON.stringify(clean) === JSON.stringify(customTheme)) return;
  customTheme = clean;
  applyTheme(clean);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: CustomThemeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return customTheme;
}

if (typeof document !== "undefined") applyTheme(customTheme);

export function useCustomTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setColor = useCallback(
    (mode: ThemeMode, key: ThemeColorKey, hex: string | null) =>
      setCustomTheme({
        ...customTheme,
        [mode]: { ...customTheme[mode], [key]: hex ?? undefined },
      }),
    []
  );

  const setFont = useCallback(
    (slot: FontSlot, id: string | null) =>
      setCustomTheme({
        ...customTheme,
        fonts: { ...customTheme.fonts, [slot]: id ?? undefined },
      }),
    []
  );

  const resetMode = useCallback(
    (mode: ThemeMode) => setCustomTheme({ ...customTheme, [mode]: {} }),
    []
  );

  const replaceTheme = useCallback(
    (nextTheme: CustomTheme) => setCustomTheme(nextTheme),
    []
  );

  return { theme, setColor, setFont, resetMode, replaceTheme };
}
