import { describe, expect, it } from "vitest";

import { rankCommands } from "@/lib/command-search";

const COMMANDS = [
  { id: "timer-play", label: "play", group: "timer" },
  { id: "timer-set", label: "set time", group: "timer" },
  { id: "jwt-decode", label: "decode token", group: "jwt" },
  { id: "json-prettify-set", label: "prettify json", group: "json prettify" },
  { id: "json-load", label: "load json", group: "json search" },
  { id: "md-open", label: "open file", group: "md builder" },
  { id: "md-paste", label: "paste markdown", group: "md builder" },
  { id: "md-save", label: "save comments", group: "md builder" },
  { id: "theme-dark", label: "dark mode", group: "theme" },
];

function ids(query: string) {
  return rankCommands(COMMANDS, query).map((command) => command.id);
}

describe("rankCommands", () => {
  it("returns everything in original order for an empty query", () => {
    expect(ids("   ")).toEqual(COMMANDS.map((command) => command.id));
  });

  it("matches tokens across group and label", () => {
    expect(ids("md paste")[0]).toBe("md-paste");
  });

  it("puts the group match first, then the label match elsewhere", () => {
    const ranked = ids("md play");
    expect(ranked.slice(0, 3).sort()).toEqual(
      ["md-open", "md-paste", "md-save"].sort()
    );
    expect(ranked[3]).toBe("timer-play");
    expect(ranked).toHaveLength(4);
  });

  it("prefers a whole-word match over a prefix", () => {
    expect(ids("json")[0]).toBe("json-prettify-set");
    expect(ids("load json")[0]).toBe("json-load");
  });

  it("falls back to fuzzy subsequence matches", () => {
    expect(ids("prtfy")).toEqual(["json-prettify-set"]);
  });

  it("drops commands that match nothing", () => {
    expect(ids("zzz")).toEqual([]);
  });

  it("ignores case", () => {
    expect(ids("DARK")).toEqual(["theme-dark"]);
  });
});
