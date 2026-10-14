import { describe, expect, it } from "vitest";

import {
  containsCriticMarkup,
  excerptOf,
  exportCriticMarkup,
  overlapsComment,
  parseCriticMarkup,
  sortComments,
} from "@/tools/md-builder/lib/critic-markup";

describe("parseCriticMarkup", () => {
  it("strips a highlighted comment and keeps its offsets", () => {
    const parsed = parseCriticMarkup("This is a {==test==}{>>why?<<}.");
    expect(parsed.source).toBe("This is a test.");
    expect(parsed.comments).toEqual([{ start: 10, end: 14, notes: ["why?"] }]);
  });

  it("treats several notes after one highlight as a thread", () => {
    const parsed = parseCriticMarkup(
      "a {==b==}{>>first<<}{>>agent: reply<<} c"
    );
    expect(parsed.comments).toEqual([
      { start: 2, end: 3, notes: ["first", "agent: reply"] },
    ]);
  });

  it("keeps a point comment as a zero-width range", () => {
    const parsed = parseCriticMarkup("before{>>note<<}after");
    expect(parsed.source).toBe("beforeafter");
    expect(parsed.comments).toEqual([{ start: 6, end: 6, notes: ["note"] }]);
  });

  it("normalizes windows line endings before measuring offsets", () => {
    const parsed = parseCriticMarkup("one\r\ntwo {==x==}{>>n<<}");
    expect(parsed.source).toBe("one\ntwo x");
    expect(parsed.comments[0]).toEqual({ start: 8, end: 9, notes: ["n"] });
  });

  it("drops a highlight whose notes are all blank", () => {
    const parsed = parseCriticMarkup("a {==b==}{>>   <<} c");
    expect(parsed.source).toBe("a b c");
    expect(parsed.comments).toEqual([]);
  });

  it("leaves other criticmarkup forms in the source untouched", () => {
    const text = "This {++is ++}a {--bad --}test {~~isn't~>is~~}.";
    expect(parseCriticMarkup(text).source).toBe(text);
  });
});

describe("exportCriticMarkup", () => {
  it("round-trips a parsed document", () => {
    const text =
      "# Title\n\nA {==quoted==}{>>one<<}{>>two<<} line.{>>point<<}\n";
    const parsed = parseCriticMarkup(text);
    expect(exportCriticMarkup(parsed.source, parsed.comments)).toBe(text);
  });

  it("writes comments in document order regardless of insertion order", () => {
    const source = "alpha beta gamma";
    const exported = exportCriticMarkup(source, [
      { start: 11, end: 16, notes: ["third"] },
      { start: 0, end: 5, notes: ["first"] },
    ]);
    expect(exported).toBe(
      "{==alpha==}{>>first<<} beta {==gamma==}{>>third<<}"
    );
  });

  it("escapes a closing marker inside a note", () => {
    const exported = exportCriticMarkup("x", [
      { start: 0, end: 1, notes: ["ends with <<}"] },
    ]);
    expect(exported).toBe("{==x==}{>>ends with << }<<}");
    expect(parseCriticMarkup(exported).comments[0].notes).toEqual([
      "ends with << }",
    ]);
  });
});

describe("helpers", () => {
  it("sorts by start then end", () => {
    const sorted = sortComments([
      { start: 5, end: 9, notes: [] },
      { start: 1, end: 9, notes: [] },
      { start: 1, end: 3, notes: [] },
    ]);
    expect(sorted.map((comment) => [comment.start, comment.end])).toEqual([
      [1, 3],
      [1, 9],
      [5, 9],
    ]);
  });

  it("detects overlap with an existing comment", () => {
    const comments = [{ start: 4, end: 8, notes: ["n"] }];
    expect(overlapsComment(comments, 0, 4)).toBe(false);
    expect(overlapsComment(comments, 7, 10)).toBe(true);
    expect(overlapsComment(comments, 8, 10)).toBe(false);
  });

  it("flags text that already carries markup", () => {
    expect(containsCriticMarkup("plain")).toBe(false);
    expect(containsCriticMarkup("has {== marker")).toBe(true);
  });

  it("collapses whitespace and truncates excerpts", () => {
    const source = "a   long\n\nquoted   passage here";
    const comment = { start: 0, end: source.length, notes: [] };
    expect(excerptOf(source, comment, 100)).toBe("a long quoted passage here");
    expect(excerptOf(source, comment, 10)).toBe("a long …");
  });
});
