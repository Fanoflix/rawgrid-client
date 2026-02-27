import type { ToolId } from "./tool-registry";

export type LayoutConfig = (ToolId | null)[];

const STORAGE_KEY = "rawgrid-layout";

export const SLOT_COUNT = 8;

export const DEFAULT_LAYOUT: LayoutConfig = [
  "unix-timestamp", // Slot 0: top-left-upper
  "timer", // Slot 1: top-left-lower
  "jwt-decoder", // Slot 2: center-left
  "color-picker", // Slot 3: center-right-upper
  "video-player", // Slot 4: center-right-lower
  "youtube-player", // Slot 5: right
  "stacked-textareas", // Slot 6: bottom-left
  "json-search", // Slot 7: bottom-right
];

export function saveLayout(config: LayoutConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function loadLayout(): LayoutConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [...DEFAULT_LAYOUT];
    const parsed = JSON.parse(stored) as LayoutConfig;
    if (!Array.isArray(parsed) || parsed.length !== SLOT_COUNT) {
      return [...DEFAULT_LAYOUT];
    }
    return parsed;
  } catch {
    return [...DEFAULT_LAYOUT];
  }
}
