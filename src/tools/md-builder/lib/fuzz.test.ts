import { describe, expect, it } from "vitest";

import { rankCommands } from "@/lib/command-search";
import {
  exportCriticMarkup,
  parseCriticMarkup,
  type CommentRange,
} from "@/tools/md-builder/lib/critic-markup";
import { renderMarkdown } from "@/tools/md-builder/lib/render-markdown";

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const MARKDOWN_PIECES = [
  "# ",
  "## ",
  "- ",
  "- [x] ",
  "> ",
  "```\n",
  "```",
  "**",
  "*",
  "_",
  "`",
  "[",
  "](https://x.y)",
  "![",
  "|",
  "| - |",
  "\n",
  "\n\n",
  " ",
  "\\*",
  "{",
  "}",
  "<",
  ">",
  "&",
  "word",
  "another",
  "émoji 🙂",
  "https://example.com/path",
  "1. ",
  "---",
];

const ITERATIONS = 300;

function randomMarkdown(random: () => number, maxPieces = 40) {
  const count = 1 + Math.floor(random() * maxPieces);
  let text = "";
  for (let index = 0; index < count; index++) {
    text += MARKDOWN_PIECES[Math.floor(random() * MARKDOWN_PIECES.length)];
  }
  return text;
}

function randomComments(random: () => number, source: string) {
  const comments: CommentRange[] = [];
  const count = Math.floor(random() * 4);
  let cursor = 0;
  for (let index = 0; index < count && cursor < source.length; index++) {
    const isPoint = random() < 0.3;
    const earliest = isPoint && comments.length > 0 ? cursor + 1 : cursor;
    if (earliest > source.length) break;
    const start =
      earliest + Math.floor(random() * (source.length - earliest + 1));
    const end = Math.min(
      source.length,
      isPoint ? start : start + 1 + Math.floor(random() * 11)
    );
    const noteCount = 1 + Math.floor(random() * 3);
    const notes = Array.from(
      { length: noteCount },
      (_, note) => `${random() < 0.5 ? "agent: " : ""}note ${index}.${note}`
    );
    comments.push({ start, end, notes });
    cursor = end;
  }
  return comments;
}

function containsMarkup(text: string) {
  return /\{==|==\}|\{>>|<<\}/.test(text);
}

function mappedSpansMatch(source: string, html: string) {
  const pattern =
    /<span(?: class="[^"]*" data-c="\d+")? data-s="(\d+)" data-e="(\d+)" data-m="1">([^<]*)<\/span>/g;
  const decode = (text: string) =>
    text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  for (const match of html.matchAll(pattern)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (source.slice(start, end) !== decode(match[3])) return false;
  }
  return true;
}

describe("fuzz: critic markup round trip", () => {
  it("re-parses what it exports for random documents and comments", () => {
    const random = makeRandom(42);
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const source = randomMarkdown(random);
      if (containsMarkup(source)) continue;
      const comments = randomComments(random, source).filter(
        (comment) => !containsMarkup(source.slice(comment.start, comment.end))
      );
      const exported = exportCriticMarkup(source, comments);
      const parsed = parseCriticMarkup(exported);
      expect(parsed.source).toBe(source.replace(/\r\n/g, "\n"));
      expect(parsed.comments.map((comment) => comment.notes)).toEqual(
        comments.map((comment) => comment.notes)
      );
      expect(exportCriticMarkup(parsed.source, parsed.comments)).toBe(exported);
    }
  });
});

describe("fuzz: markdown renderer", () => {
  it("never throws and keeps every mapped span aligned with the source", () => {
    const random = makeRandom(7);
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const source = randomMarkdown(random, 60);
      const comments = randomComments(random, source).map((comment, id) => ({
        ...comment,
        id: id + 1,
      }));
      const html = renderMarkdown(source, comments);
      expect(html).not.toContain("<script");
      expect(mappedSpansMatch(source, html)).toBe(true);
      for (const comment of comments) {
        expect(html).toContain(`data-c="${comment.id}"`);
      }
    }
  });
});

describe("fuzz: command search", () => {
  it("never throws and keeps results a subset of the input", () => {
    const random = makeRandom(99);
    const commands = [
      { label: "play", group: "timer" },
      { label: "paste markdown", group: "md builder" },
      { label: "prettify json", group: "json prettify" },
      { label: "dark mode", group: "theme" },
    ];
    const alphabet = "abcdefghijklmnopqrstuvwxyz   ()[]{}*+?.^$|\\";
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      const length = Math.floor(random() * 12);
      let query = "";
      for (let index = 0; index < length; index++) {
        query += alphabet[Math.floor(random() * alphabet.length)];
      }
      const ranked = rankCommands(commands, query);
      expect(ranked.every((command) => commands.includes(command))).toBe(true);
      expect(new Set(ranked).size).toBe(ranked.length);
    }
  });
});
