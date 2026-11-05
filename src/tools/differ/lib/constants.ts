import type { IndentId } from "@/tools/json-prettify/lib/constants";

export interface DifferConfig {
  defaultFontSize: number;
  minFontSize: number;
  maxFontSize: number;
  jsonIndent: IndentId;
  maxFileBytes: number;
  diffScanLimit: number;
  diffTimeoutMs: number;
  collapseMargin: number;
  collapseMinSize: number;
}

export const DIFFER_CONFIG: DifferConfig = {
  defaultFontSize: 11,
  minFontSize: 7,
  maxFontSize: 18,
  jsonIndent: "2",
  maxFileBytes: 10 * 1024 * 1024,
  diffScanLimit: 500,
  diffTimeoutMs: 2000,
  collapseMargin: 3,
  collapseMinSize: 4,
};

export type DiffSide = "original" | "changed";

export const DIFF_SIDES: readonly DiffSide[] = ["original", "changed"];

export type ChangeDirection = 1 | -1;

export interface DifferSettings {
  original: string;
  changed: string;
  isJsonMode: boolean;
  isIgnoringWhitespace: boolean;
  isCollapsingUnchanged: boolean;
}

export const DEFAULT_ORIGINAL = [
  "rawgrid differ",
  "paste text on both sides",
  "changes show up as you type",
  "",
].join("\n");

export const DEFAULT_CHANGED = [
  "rawgrid differ",
  "paste or drop a file on both sides",
  "changes show up as you type",
  "json mode formats both sides first",
  "",
].join("\n");

export const DEFAULT_DIFFER_SETTINGS: DifferSettings = {
  original: DEFAULT_ORIGINAL,
  changed: DEFAULT_CHANGED,
  isJsonMode: false,
  isIgnoringWhitespace: false,
  isCollapsingUnchanged: false,
};

export const DIFFER_COMMANDS = {
  swap: "differ:swap",
  clear: "differ:clear",
  next: "differ:next",
  previous: "differ:previous",
  json: "differ:json",
  whitespace: "differ:whitespace",
  collapse: "differ:collapse",
  setOriginal: "differ:set-original",
  setChanged: "differ:set-changed",
} as const;

export const DIFFER_COPY = {
  name: "differ",
  description: "compare two texts side by side.",
  helpTrigger: "help",
  help: "type, paste or drop a file on either side. changed lines and words light up as you go. json formats both sides with sorted keys, so key order and spacing stop showing up as changes. ignore whitespace skips spaces and tabs. collapse folds the lines that match.",
  sideLabels: { original: "original", changed: "changed" },
  placeholders: {
    original: "paste the original or drop a file",
    changed: "paste the changed text or drop a file",
  },
  json: "json",
  jsonHint: "format both sides as json with sorted keys",
  whitespace: "ignore whitespace",
  whitespaceHint: "skip spaces and tabs when comparing",
  collapse: "collapse",
  collapseHint: "fold lines that match",
  swap: "swap sides",
  previous: "previous change",
  next: "next change",
  identical: "identical",
  empty: "nothing to compare",
  clearSide: "clear",
  copySide: "copy",
  fileTooLarge: "file is over 10 mb",
  fileNotText: "that file isn't text",
  fileUnreadable: "couldn't read that file",
  jsonErrorPrefix: "not json:",
} as const;
