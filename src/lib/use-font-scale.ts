import { useCallback, useSyncExternalStore } from "react";

import {
  FONT_SCALE,
  clampFontScaleLevel,
  fontScaleForLevel,
  parseFontScaleLevel,
} from "@/lib/font-scale";

type FontScaleListener = () => void;

const listeners = new Set<FontScaleListener>();
let fontScaleLevel = readStoredLevel();

function readStoredLevel() {
  if (typeof window === "undefined") return FONT_SCALE.defaultLevel;
  try {
    return parseFontScaleLevel(
      window.localStorage.getItem(FONT_SCALE.storageKey)
    );
  } catch {
    return FONT_SCALE.defaultLevel;
  }
}

function applyLevel(level: number) {
  document.documentElement.style.setProperty(
    FONT_SCALE.cssVariable,
    String(fontScaleForLevel(level))
  );
  try {
    window.localStorage.setItem(FONT_SCALE.storageKey, String(level));
  } catch {
    return;
  }
}

function setLevel(level: number) {
  const clamped = clampFontScaleLevel(Math.round(level));
  if (clamped === fontScaleLevel) return;
  fontScaleLevel = clamped;
  applyLevel(clamped);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: FontScaleListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return fontScaleLevel;
}

if (typeof document !== "undefined") applyLevel(fontScaleLevel);

export function useFontScale() {
  const level = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setFontScaleLevel = useCallback((nextLevel: number) => setLevel(nextLevel), []);
  const increaseFontScale = useCallback(() => setLevel(fontScaleLevel + 1), []);
  const decreaseFontScale = useCallback(() => setLevel(fontScaleLevel - 1), []);
  const resetFontScale = useCallback(() => setLevel(FONT_SCALE.defaultLevel), []);

  return {
    level,
    scale: fontScaleForLevel(level),
    setFontScaleLevel,
    increaseFontScale,
    decreaseFontScale,
    resetFontScale,
  };
}
