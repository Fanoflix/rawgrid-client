import { hexToRgb, parseHexInput } from "@/tools/color-picker/lib/utils";

export type ThemeMode = "light" | "dark";
export type ThemeColorKey = "primary" | "accent";
export type FontSlot = "ui" | "mono";

export type ModeColors = Partial<Record<ThemeColorKey, string>>;

export interface CustomTheme {
  fonts: Partial<Record<FontSlot, string>>;
  light: ModeColors;
  dark: ModeColors;
}

export interface FontOption {
  id: string;
  label: string;
  family: string;
}

export const THEME_MODES: readonly ThemeMode[] = ["light", "dark"];
export const THEME_COLOR_KEYS: readonly ThemeColorKey[] = ["primary", "accent"];
export const FONT_SLOTS: readonly FontSlot[] = ["ui", "mono"];

export const CUSTOM_THEME_STORAGE = {
  themeKey: "custom-theme",
  cssKey: "custom-theme-css",
  styleElementId: "custom-theme",
} as const;

export const EMPTY_CUSTOM_THEME: CustomTheme = { fonts: {}, light: {}, dark: {} };

export const DEFAULT_THEME_COLORS: Record<ThemeMode, Record<ThemeColorKey, string>> = {
  light: { primary: "#e7000b", accent: "#1a83db" },
  dark: { primary: "#fb2c36", accent: "#1a83db" },
};

export const FONT_OPTIONS: Record<FontSlot, readonly FontOption[]> = {
  ui: [
    { id: "nunito-sans", label: "nunito sans", family: '"Nunito Sans Variable", sans-serif' },
    { id: "inter", label: "inter", family: '"Inter Variable", sans-serif' },
    { id: "geist", label: "geist", family: '"Geist Variable", sans-serif' },
    { id: "ibm-plex-sans", label: "ibm plex sans", family: '"IBM Plex Sans Variable", sans-serif' },
    { id: "system", label: "system", family: "system-ui, sans-serif" },
  ],
  mono: [
    {
      id: "system",
      label: "system mono",
      family:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
    { id: "jetbrains-mono", label: "jetbrains mono", family: '"JetBrains Mono Variable", monospace' },
    { id: "geist-mono", label: "geist mono", family: '"Geist Mono Variable", monospace' },
    { id: "fira-code", label: "fira code", family: '"Fira Code Variable", monospace' },
  ],
};

export const DEFAULT_FONTS: Record<FontSlot, string> = {
  ui: "nunito-sans",
  mono: "system",
};

const COLOR_VARIABLES: Record<ThemeColorKey, string> = {
  primary: "--primary",
  accent: "--md-agent",
};

const FONT_VARIABLES: Record<FontSlot, string> = {
  ui: "--font-ui",
  mono: "--font-code",
};

const FOREGROUND_ON_COLOR = {
  light: "oklch(0.985 0 0)",
  dark: "oklch(0.141 0.005 285.823)",
} as const;

const MODE_SELECTORS: Record<ThemeMode, string> = {
  light: "html:not(.dark)",
  dark: "html.dark",
};

export function normalizeHexColor(value: string) {
  return parseHexInput(value);
}

export function fontOptionById(slot: FontSlot, id: string) {
  return FONT_OPTIONS[slot].find((option) => option.id === id) ?? null;
}

export function effectiveColor(theme: CustomTheme, mode: ThemeMode, key: ThemeColorKey) {
  return theme[mode][key] ?? DEFAULT_THEME_COLORS[mode][key];
}

export function effectiveFont(theme: CustomTheme, slot: FontSlot) {
  return theme.fonts[slot] ?? DEFAULT_FONTS[slot];
}

function relativeLuminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableForeground(hex: string) {
  const luminance = relativeLuminance(hex);
  const contrastWithLight = 1.05 / (luminance + 0.05);
  const contrastWithDark = (luminance + 0.05) / 0.05;
  return contrastWithLight >= contrastWithDark
    ? FOREGROUND_ON_COLOR.light
    : FOREGROUND_ON_COLOR.dark;
}

export function withoutDefaults(theme: CustomTheme): CustomTheme {
  const fonts: CustomTheme["fonts"] = {};
  for (const slot of FONT_SLOTS) {
    const id: unknown = theme.fonts[slot];
    if (typeof id === "string" && id !== DEFAULT_FONTS[slot] && fontOptionById(slot, id)) {
      fonts[slot] = id;
    }
  }
  const colorsFor = (mode: ThemeMode) => {
    const colors: ModeColors = {};
    for (const key of THEME_COLOR_KEYS) {
      const value: unknown = theme[mode][key];
      const hex = typeof value === "string" ? normalizeHexColor(value) : null;
      if (hex && hex !== DEFAULT_THEME_COLORS[mode][key]) colors[key] = hex;
    }
    return colors;
  };
  return { fonts, light: colorsFor("light"), dark: colorsFor("dark") };
}

function cssRule(selector: string, declarations: string[]) {
  return declarations.length ? `${selector} { ${declarations.join(" ")} }` : "";
}

export function customThemeCss(theme: CustomTheme) {
  const clean = withoutDefaults(theme);
  const fontDeclarations = FONT_SLOTS.flatMap((slot) => {
    const id = clean.fonts[slot];
    const option = id ? fontOptionById(slot, id) : null;
    return option ? [`${FONT_VARIABLES[slot]}: ${option.family};`] : [];
  });
  const modeRules = THEME_MODES.map((mode) => {
    const declarations = THEME_COLOR_KEYS.flatMap((key) => {
      const hex = clean[mode][key];
      if (!hex) return [];
      const declaration = `${COLOR_VARIABLES[key]}: ${hex};`;
      return key === "primary"
        ? [declaration, `--primary-foreground: ${readableForeground(hex)};`]
        : [declaration];
    });
    return cssRule(MODE_SELECTORS[mode], declarations);
  });
  return [cssRule(":root:root", fontDeclarations), ...modeRules]
    .filter(Boolean)
    .join("\n");
}

export function parseStoredCustomTheme(raw: string | null): CustomTheme {
  if (!raw) return EMPTY_CUSTOM_THEME;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return EMPTY_CUSTOM_THEME;
    const record = parsed as Record<string, unknown>;
    const asRecord = (value: unknown) =>
      value && typeof value === "object" ? (value as Record<string, string>) : {};
    return withoutDefaults({
      fonts: asRecord(record.fonts),
      light: asRecord(record.light),
      dark: asRecord(record.dark),
    });
  } catch {
    return EMPTY_CUSTOM_THEME;
  }
}
