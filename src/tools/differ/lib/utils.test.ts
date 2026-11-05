import { Chunk } from "@codemirror/merge";
import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { DEFAULT_DIFFER_SETTINGS } from "@/tools/differ/lib/constants";
import {
  buildDiffConfig,
  describeChangePosition,
  deserializeDifferSettings,
  findActiveChange,
  formatJsonSide,
  isBinaryText,
  serializeDifferSettings,
  summarizeChunks,
} from "@/tools/differ/lib/utils";

function textOf(value: string) {
  return Text.of(value.split("\n"));
}

function chunksFor(
  original: string,
  changed: string,
  isIgnoringWhitespace = false
) {
  return Chunk.build(
    textOf(original),
    textOf(changed),
    buildDiffConfig(isIgnoringWhitespace)
  );
}

describe("settings round trip", () => {
  it("keeps empty sides empty", () => {
    const settings = {
      ...DEFAULT_DIFFER_SETTINGS,
      original: "",
      changed: "",
      isJsonMode: true,
    };
    expect(deserializeDifferSettings(serializeDifferSettings(settings))).toEqual(
      settings
    );
  });

  it("falls back to defaults for broken or partial data", () => {
    expect(deserializeDifferSettings("not json")).toEqual(
      DEFAULT_DIFFER_SETTINGS
    );
    expect(
      deserializeDifferSettings(JSON.stringify({ original: 4, isJsonMode: "yes" }))
    ).toEqual(DEFAULT_DIFFER_SETTINGS);
  });
});

describe("formatJsonSide", () => {
  it("formats with sorted keys", () => {
    expect(formatJsonSide('{"b":1,"a":{"d":2,"c":3}}').text).toBe(
      '{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}'
    );
  });

  it("keeps the text and reports invalid json", () => {
    const result = formatJsonSide("{oops");
    expect(result.text).toBe("{oops");
    expect(result.error).toMatch(/^not json:/);
  });

  it("leaves blank text alone", () => {
    expect(formatJsonSide("  ")).toEqual({ text: "  ", error: null });
  });

  it("makes key order irrelevant to the diff", () => {
    const original = formatJsonSide('{"a":1,"b":[1,2]}').text;
    const changed = formatJsonSide('{ "b": [1, 2], "a": 1 }').text;
    expect(chunksFor(original, changed)).toHaveLength(0);
  });
});

describe("ignore whitespace", () => {
  it("sees indentation and trailing spaces as changes by default", () => {
    expect(chunksFor("a\n  b\nc", "a\n\tb  \nc")).toHaveLength(1);
  });

  it("ignores indentation, inner spacing and trailing spaces", () => {
    expect(chunksFor("a\n  b c\nd", "a\n\tb  c \nd", true)).toHaveLength(0);
  });

  it("still reports real changes on lines with whitespace changes", () => {
    const chunks = chunksFor("a\n  b\nc", "a\n    x\nc", true);
    expect(chunks).toHaveLength(1);
    const summary = summarizeChunks(
      chunks,
      textOf("a\n  b\nc"),
      textOf("a\n    x\nc"),
      -1
    );
    expect(summary.addedLines).toBe(1);
    expect(summary.removedLines).toBe(1);
  });

  it("keeps added lines as changes", () => {
    const original = "x\n  y";
    const changed = "x\nz\n  y";
    const chunks = chunksFor(original, changed, true);
    expect(chunks).toHaveLength(1);
    expect(
      summarizeChunks(chunks, textOf(original), textOf(changed), -1)
    ).toMatchObject({ addedLines: 1, removedLines: 0 });
  });
});

describe("summarizeChunks", () => {
  it("counts added and removed lines across chunks", () => {
    const original = "one\ntwo\nthree\nfour\nfive\n";
    const changed = "one\n2\nthree\nfour\nfive\nsix\nseven\n";
    const chunks = chunksFor(original, changed);
    expect(
      summarizeChunks(chunks, textOf(original), textOf(changed), -1)
    ).toEqual({ changeCount: 2, addedLines: 3, removedLines: 1, activeChange: -1 });
  });

  it("reports nothing for identical texts", () => {
    const chunks = chunksFor("same", "same");
    expect(summarizeChunks(chunks, textOf("same"), textOf("same"), -1)).toEqual(
      { changeCount: 0, addedLines: 0, removedLines: 0, activeChange: -1 }
    );
  });
});

describe("findActiveChange", () => {
  const original = "a\nb\nc\nd\ne";
  const changed = "a\nB\nc\nd\nE";
  const chunks = chunksFor(original, changed);

  it("finds the change under the cursor on either side", () => {
    expect(findActiveChange(chunks, "original", 2)).toBe(0);
    expect(findActiveChange(chunks, "changed", 8)).toBe(1);
  });

  it("returns -1 between changes", () => {
    expect(findActiveChange(chunks, "changed", 4)).toBe(-1);
  });
});

describe("describeChangePosition", () => {
  it("shows the total, or the position inside a change", () => {
    const summary = { changeCount: 3, addedLines: 0, removedLines: 0, activeChange: -1 };
    expect(describeChangePosition(summary)).toBe("3 changes");
    expect(describeChangePosition({ ...summary, changeCount: 1 })).toBe("1 change");
    expect(describeChangePosition({ ...summary, activeChange: 1 })).toBe("2/3");
  });
});

describe("isBinaryText", () => {
  it("flags text with nul characters", () => {
    expect(isBinaryText("PNG\u0000\u0001")).toBe(true);
    expect(isBinaryText("plain")).toBe(false);
  });
});
