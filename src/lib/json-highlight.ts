import { parser } from "@lezer/json";
import { highlightTree, tags, tagHighlighter } from "@lezer/highlight";
import type { SyntaxNode } from "@lezer/common";

// Shared by the JSON editors (via CodeMirror) and static JSON snippets, so both
// color the same way. The colors themselves are the .json-* classes in
// index.css (One Dark Pro / One Light).

export const jsonTagHighlighter = tagHighlighter([
  { tag: tags.propertyName, class: "json-key" },
  { tag: tags.string, class: "json-string" },
  { tag: tags.number, class: "json-number" },
  { tag: [tags.bool, tags.null], class: "json-literal" },
  { tag: tags.separator, class: "json-punctuation" },
]);

const BRACKET_DEPTH_COLORS = 3;

export function isBracket(name: string) {
  return name === "{" || name === "}" || name === "[" || name === "]";
}

/** Bracket pairs cycle through three colors by how deeply they're nested. */
export function getBracketClass(bracket: SyntaxNode) {
  let depth = 0;
  for (let parent = bracket.parent?.parent; parent; parent = parent.parent) {
    if (parent.name === "Object" || parent.name === "Array") depth += 1;
  }
  return `json-bracket-${depth % BRACKET_DEPTH_COLORS}`;
}

interface JsonSegment {
  text: string;
  className?: string;
}

interface ClassedRange {
  from: number;
  to: number;
  className: string;
}

/**
 * Splits JSON text into colored segments for static rendering. Works on
 * fragments too (like search results): a string followed by ":" is treated
 * as a key even when there's no enclosing object for the parser to see.
 */
export function highlightJson(code: string): JsonSegment[] {
  const tree = parser.parse(code);
  const classedRanges: ClassedRange[] = [];

  highlightTree(tree, jsonTagHighlighter, (from, to, className) => {
    const isFragmentKey =
      className === "json-string" && /^\s*:/.test(code.slice(to));
    classedRanges.push({ from, to, className: isFragmentKey ? "json-key" : className });
  });
  tree.iterate({
    enter: (node) => {
      if (!isBracket(node.name)) return;
      classedRanges.push({ from: node.from, to: node.to, className: getBracketClass(node.node) });
    },
  });
  classedRanges.sort((first, second) => first.from - second.from);

  const segments: JsonSegment[] = [];
  let position = 0;
  for (const range of classedRanges) {
    if (range.from < position) continue;
    if (range.from > position) segments.push({ text: code.slice(position, range.from) });
    segments.push({ text: code.slice(range.from, range.to), className: range.className });
    position = range.to;
  }
  if (position < code.length) segments.push({ text: code.slice(position) });
  return segments;
}
