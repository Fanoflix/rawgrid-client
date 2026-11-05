import { Change, diff, type Chunk, type DiffConfig } from "@codemirror/merge";
import type { Text } from "@codemirror/state";

import type { DiffSide, DifferSettings } from "@/tools/differ/lib/constants";
import {
  DEFAULT_DIFFER_SETTINGS,
  DIFFER_CONFIG,
  DIFFER_COPY,
} from "@/tools/differ/lib/constants";
import { prettifyJson } from "@/tools/json-prettify/lib/utils";

export interface DiffSummary {
  changeCount: number;
  addedLines: number;
  removedLines: number;
  activeChange: number;
}

export interface SideFormatResult {
  text: string;
  error: string | null;
}

interface StrippedText {
  text: string;
  offsets: number[];
}

const INLINE_WHITESPACE = /[^\S\n]/;
const NUL_CHARACTER = "\u0000";

export const EMPTY_DIFF_SUMMARY: DiffSummary = {
  changeCount: 0,
  addedLines: 0,
  removedLines: 0,
  activeChange: -1,
};

export function serializeDifferSettings(settings: DifferSettings) {
  return JSON.stringify(settings);
}

export function deserializeDifferSettings(raw: string): DifferSettings {
  try {
    const parsed = JSON.parse(raw) as Partial<DifferSettings> | null;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_DIFFER_SETTINGS };
    }
    return {
      original:
        typeof parsed.original === "string"
          ? parsed.original
          : DEFAULT_DIFFER_SETTINGS.original,
      changed:
        typeof parsed.changed === "string"
          ? parsed.changed
          : DEFAULT_DIFFER_SETTINGS.changed,
      isJsonMode: parsed.isJsonMode === true,
      isIgnoringWhitespace: parsed.isIgnoringWhitespace === true,
      isCollapsingUnchanged: parsed.isCollapsingUnchanged === true,
    };
  } catch {
    return { ...DEFAULT_DIFFER_SETTINGS };
  }
}

export function otherSide(side: DiffSide): DiffSide {
  return side === "original" ? "changed" : "original";
}

export function formatJsonSide(text: string): SideFormatResult {
  if (!text.trim()) return { text, error: null };
  const result = prettifyJson(text, DIFFER_CONFIG.jsonIndent, true);
  if (result.error) {
    return { text, error: `${DIFFER_COPY.jsonErrorPrefix} ${result.error}` };
  }
  return { text: result.value, error: null };
}

export function isBinaryText(text: string) {
  return text.includes(NUL_CHARACTER);
}

function stripInlineWhitespace(source: string): StrippedText {
  const characters: string[] = [];
  const offsets: number[] = [];
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (INLINE_WHITESPACE.test(character)) continue;
    characters.push(character);
    offsets.push(index);
  }
  offsets.push(source.length);
  return { text: characters.join(""), offsets };
}

function toSourceRange(
  offsets: number[],
  from: number,
  to: number
): [number, number] {
  if (from === to) {
    const afterPrevious = from === 0 ? 0 : offsets[from - 1] + 1;
    return [afterPrevious, afterPrevious];
  }
  return [offsets[from], offsets[to - 1] + 1];
}

export function createWhitespaceBlindDiff(config: DiffConfig) {
  return (original: string, changed: string): readonly Change[] => {
    const strippedOriginal = stripInlineWhitespace(original);
    const strippedChanged = stripInlineWhitespace(changed);
    return diff(strippedOriginal.text, strippedChanged.text, config).map(
      (change) => {
        const [fromA, toA] = toSourceRange(
          strippedOriginal.offsets,
          change.fromA,
          change.toA
        );
        const [fromB, toB] = toSourceRange(
          strippedChanged.offsets,
          change.fromB,
          change.toB
        );
        return new Change(fromA, toA, fromB, toB);
      }
    );
  };
}

export function buildDiffConfig(isIgnoringWhitespace: boolean): DiffConfig {
  const config: DiffConfig = {
    scanLimit: DIFFER_CONFIG.diffScanLimit,
    timeout: DIFFER_CONFIG.diffTimeoutMs,
  };
  if (!isIgnoringWhitespace) return config;
  return { override: createWhitespaceBlindDiff(config) };
}

function countChunkLines(doc: Text, from: number, to: number, end: number) {
  if (to <= from) return 0;
  return doc.lineAt(end).number - doc.lineAt(from).number + 1;
}

function chunkRangeOn(chunk: Chunk, side: DiffSide): [number, number] {
  if (side === "original") return [chunk.fromA, chunk.endA];
  return [chunk.fromB, chunk.endB];
}

export function findActiveChange(
  chunks: readonly Chunk[],
  side: DiffSide,
  head: number
) {
  return chunks.findIndex((chunk) => {
    const [from, end] = chunkRangeOn(chunk, side);
    return from <= head && head <= end;
  });
}

export function summarizeChunks(
  chunks: readonly Chunk[],
  original: Text,
  changed: Text,
  activeChange: number
): DiffSummary {
  let addedLines = 0;
  let removedLines = 0;
  for (const chunk of chunks) {
    removedLines += countChunkLines(
      original,
      chunk.fromA,
      chunk.toA,
      chunk.endA
    );
    addedLines += countChunkLines(changed, chunk.fromB, chunk.toB, chunk.endB);
  }
  return {
    changeCount: chunks.length,
    addedLines,
    removedLines,
    activeChange,
  };
}

export function describeChangePosition(summary: DiffSummary) {
  const total = summary.changeCount;
  if (summary.activeChange < 0) {
    return total === 1 ? "1 change" : `${total} changes`;
  }
  return `${summary.activeChange + 1}/${total}`;
}
