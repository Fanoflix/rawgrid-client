import type { SyntaxNode, Tree } from "@lezer/common";

import {
  FONT_OPTIONS,
  FONT_SLOTS,
  THEME_COLOR_KEYS,
  THEME_MODES,
  effectiveColor,
  effectiveFont,
  normalizeHexColor,
  withoutDefaults,
  type CustomTheme,
  type FontSlot,
  type ThemeColorKey,
  type ThemeMode,
} from "@/lib/custom-theme";
import { FONT_SCALE, FONT_SCALE_LEVELS } from "@/lib/font-scale";

export interface Settings {
  fontScaleLevel: number;
  theme: CustomTheme;
}

export interface SettingsJsonError {
  path: string;
  message: string;
}

export type SettingsJsonResult =
  | { settings: Settings; errors: null }
  | { settings: null; errors: SettingsJsonError[] };

export type SettingsField =
  | { kind: "color"; mode: ThemeMode; key: ThemeColorKey }
  | { kind: "font"; slot: FontSlot };

export interface SettingsFieldRange {
  field: SettingsField;
  path: string;
  from: number;
  to: number;
  value: string;
}

const ROOT_KEYS = ["fontSize", "fonts", ...THEME_MODES] as const;

function fontSizePercent(level: number) {
  return 100 + level * 10;
}

const FONT_SIZE_PERCENTS = FONT_SCALE_LEVELS.map(fontSizePercent);

export function settingsToJson({ fontScaleLevel, theme }: Settings) {
  const fonts = Object.fromEntries(
    FONT_SLOTS.map((slot) => [slot, effectiveFont(theme, slot)])
  );
  const colorsFor = (mode: ThemeMode) =>
    Object.fromEntries(
      THEME_COLOR_KEYS.map((key) => [key, effectiveColor(theme, mode, key)])
    );
  return JSON.stringify(
    {
      fontSize: fontSizePercent(fontScaleLevel),
      fonts,
      light: colorsFor("light"),
      dark: colorsFor("dark"),
    },
    null,
    2
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function quoteList(values: readonly (string | number)[]) {
  return values.map((value) => (typeof value === "string" ? `"${value}"` : value)).join(", ");
}

function unknownKeyErrors(
  record: Record<string, unknown>,
  allowed: readonly string[],
  pathPrefix: string
) {
  return Object.keys(record)
    .filter((key) => !allowed.includes(key))
    .map((key) => ({
      path: `${pathPrefix}${key}`,
      message: `unknown key, expected one of ${quoteList(allowed)}`,
    }));
}

export function parseSettingsJson(text: string): SettingsJsonResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { settings: null, errors: [{ path: "json", message }] };
  }
  if (!isPlainObject(parsed)) {
    return { settings: null, errors: [{ path: "json", message: "expected an object" }] };
  }

  const errors: SettingsJsonError[] = unknownKeyErrors(parsed, ROOT_KEYS, "");
  let fontScaleLevel: number = FONT_SCALE.defaultLevel;
  const theme: CustomTheme = { fonts: {}, light: {}, dark: {} };

  if (parsed.fontSize !== undefined) {
    const index = FONT_SIZE_PERCENTS.indexOf(parsed.fontSize as number);
    if (typeof parsed.fontSize === "number" && index !== -1) {
      fontScaleLevel = FONT_SCALE_LEVELS[index];
    } else {
      errors.push({
        path: "fontSize",
        message: `expected one of ${quoteList(FONT_SIZE_PERCENTS)}`,
      });
    }
  }

  if (parsed.fonts !== undefined) {
    if (!isPlainObject(parsed.fonts)) {
      errors.push({ path: "fonts", message: "expected an object" });
    } else {
      errors.push(...unknownKeyErrors(parsed.fonts, FONT_SLOTS, "fonts."));
      for (const slot of FONT_SLOTS) {
        const value = parsed.fonts[slot];
        if (value === undefined) continue;
        const ids = FONT_OPTIONS[slot].map((option) => option.id);
        if (typeof value === "string" && ids.includes(value)) {
          theme.fonts[slot] = value;
        } else {
          errors.push({ path: `fonts.${slot}`, message: `expected one of ${quoteList(ids)}` });
        }
      }
    }
  }

  for (const mode of THEME_MODES) {
    const colors = parsed[mode];
    if (colors === undefined) continue;
    if (!isPlainObject(colors)) {
      errors.push({ path: mode, message: "expected an object" });
      continue;
    }
    errors.push(...unknownKeyErrors(colors, THEME_COLOR_KEYS, `${mode}.`));
    for (const key of THEME_COLOR_KEYS) {
      const value = colors[key];
      if (value === undefined) continue;
      const hex = typeof value === "string" ? normalizeHexColor(value) : null;
      if (hex) {
        theme[mode][key] = hex;
      } else {
        errors.push({
          path: `${mode}.${key}`,
          message: "expected a hex color like \"#e7000b\"",
        });
      }
    }
  }

  if (errors.length) return { settings: null, errors };
  return { settings: { fontScaleLevel, theme: withoutDefaults(theme) }, errors: null };
}

export function fieldForPath(path: readonly string[]): SettingsField | null {
  if (path.length !== 2) return null;
  const [parent, key] = path;
  if (parent === "fonts" && (FONT_SLOTS as readonly string[]).includes(key)) {
    return { kind: "font", slot: key as FontSlot };
  }
  if (
    (THEME_MODES as readonly string[]).includes(parent) &&
    (THEME_COLOR_KEYS as readonly string[]).includes(key)
  ) {
    return { kind: "color", mode: parent as ThemeMode, key: key as ThemeColorKey };
  }
  return null;
}

function unquote(raw: string) {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function propertyPath(valueNode: SyntaxNode, readText: (from: number, to: number) => string) {
  const path: string[] = [];
  for (
    let property: SyntaxNode | null = valueNode.parent;
    property?.name === "Property";
    property = property.parent?.parent ?? null
  ) {
    const keyNode = property.getChild("PropertyName");
    const key = keyNode ? unquote(readText(keyNode.from, keyNode.to)) : null;
    if (key === null) return null;
    path.unshift(key);
  }
  return path;
}

export function findSettingsFields(
  tree: Tree,
  readText: (from: number, to: number) => string
): SettingsFieldRange[] {
  const ranges: SettingsFieldRange[] = [];
  tree.iterate({
    enter: (node) => {
      if (node.name !== "String" || node.node.parent?.name !== "Property") return;
      const path = propertyPath(node.node, readText);
      const field = path ? fieldForPath(path) : null;
      const value = unquote(readText(node.from, node.to));
      if (!path || !field || value === null) return;
      ranges.push({ field, path: path.join("."), from: node.from, to: node.to, value });
    },
  });
  return ranges;
}
