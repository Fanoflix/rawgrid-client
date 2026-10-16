export const FONT_SCALE = {
  storageKey: "font-scale",
  cssVariable: "--font-scale",
  minLevel: -1,
  maxLevel: 5,
  defaultLevel: 0,
  stepPerLevel: 0.1,
} as const;

export const FONT_SCALE_COMMANDS = {
  increase: "font-scale:increase",
  decrease: "font-scale:decrease",
  reset: "font-scale:reset",
} as const;

export const FONT_SCALE_LEVELS = Array.from(
  { length: FONT_SCALE.maxLevel - FONT_SCALE.minLevel + 1 },
  (_, index) => FONT_SCALE.minLevel + index
);

export function clampFontScaleLevel(level: number) {
  return Math.min(FONT_SCALE.maxLevel, Math.max(FONT_SCALE.minLevel, level));
}

export function parseFontScaleLevel(raw: string | null) {
  if (raw === null || raw.trim() === "") return FONT_SCALE.defaultLevel;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return FONT_SCALE.defaultLevel;
  return clampFontScaleLevel(parsed);
}

export function fontScaleForLevel(level: number) {
  return Math.round((1 + level * FONT_SCALE.stepPerLevel) * 100) / 100;
}

export function fontScalePercentLabel(level: number) {
  return `${Math.round(fontScaleForLevel(level) * 100)}%`;
}
