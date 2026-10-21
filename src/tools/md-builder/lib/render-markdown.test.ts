import { describe, expect, it } from "vitest";

import { renderMarkdown } from "@/tools/md-builder/lib/render-markdown";

interface MappedSpan {
  start: number;
  end: number;
  text: string;
  commentId: number | null;
}

function mappedSpans(html: string): MappedSpan[] {
  const pattern =
    /<span(?: class="md-hl" data-c="(\d+)")? data-s="(\d+)" data-e="(\d+)" data-m="1">([^<]*)<\/span>/g;
  return [...html.matchAll(pattern)].map((match) => ({
    commentId: match[1] ? Number(match[1]) : null,
    start: Number(match[2]),
    end: Number(match[3]),
    text: match[4],
  }));
}

function expectSpansMapToSource(source: string, html: string) {
  for (const span of mappedSpans(html)) {
    expect(source.slice(span.start, span.end)).toBe(span.text);
  }
}

describe("renderMarkdown", () => {
  it("renders headings, paragraphs and inline marks", () => {
    const html = renderMarkdown("# Title\n\nSome **bold** and *em* text.", []);
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>");
    expect(html).toContain("<em>");
    expect(html).toContain("<p>");
  });

  it("maps every text span back to the exact source slice", () => {
    const source = [
      "# Heading",
      "",
      "Para with `code`, [link](https://x.y) and **bold**.",
      "Second line of the same paragraph.",
      "",
      "- item one",
      "  continued",
      "- [ ] task item",
      "",
      "> quoted _text_",
      "",
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "```js",
      "const x = 1;",
      "```",
    ].join("\n");
    const html = renderMarkdown(source, []);
    expectSpansMapToSource(source, html);
    expect(html).toContain("<table>");
    expect(html).toContain("<pre><code");
    expect(html).toContain("<blockquote>");
    expect(html).toContain('class="md-task"');
  });

  it("splits a text span around a highlighted comment", () => {
    const source = "alpha beta gamma";
    const html = renderMarkdown(source, [
      { id: 7, start: 6, end: 10, notes: ["n"] },
    ]);
    const spans = mappedSpans(html);
    expect(spans).toEqual([
      { start: 0, end: 6, text: "alpha ", commentId: null },
      { start: 6, end: 10, text: "beta", commentId: 7 },
      { start: 10, end: 16, text: " gamma", commentId: null },
    ]);
  });

  it("carries a highlight across an inline mark boundary", () => {
    const source = "see **bold words** here";
    const html = renderMarkdown(source, [
      { id: 1, start: 6, end: 16, notes: ["n"] },
    ]);
    expectSpansMapToSource(source, html);
    const highlighted = mappedSpans(html).filter(
      (span) => span.commentId === 1
    );
    expect(highlighted.map((span) => span.text).join("")).toBe("bold words");
  });

  it("emits a point marker once at its position", () => {
    const html = renderMarkdown("one two", [
      { id: 3, start: 4, end: 4, notes: ["n"] },
    ]);
    const markers = html.match(/class="md-pt" data-c="3"/g) ?? [];
    expect(markers).toHaveLength(1);
    expect(html.indexOf('data-c="3"')).toBeLessThan(html.indexOf("two"));
  });

  it("places a point marker at the end of its own paragraph", () => {
    const source = "one\n\ntwo";
    const html = renderMarkdown(source, [
      { id: 4, start: 3, end: 3, notes: ["n"] },
    ]);
    const marker = html.indexOf('data-c="4"');
    expect(marker).toBeGreaterThan(html.indexOf(">one<"));
    expect(marker).toBeLessThan(html.indexOf(">two<"));
    expectSpansMapToSource(source, html);
  });

  it("splits a span at a point marker inside it", () => {
    const source = "alpha beta";
    const html = renderMarkdown(source, [
      { id: 5, start: 5, end: 5, notes: ["n"] },
    ]);
    expect(mappedSpans(html).map((span) => span.text)).toEqual([
      "alpha",
      " beta",
    ]);
    expect(html.indexOf('data-c="5"')).toBeGreaterThan(html.indexOf("alpha"));
    expect(html.indexOf('data-c="5"')).toBeLessThan(html.indexOf(" beta"));
  });

  it("appends a point marker that sits at the very end", () => {
    const source = "done";
    const html = renderMarkdown(source, [
      { id: 9, start: 4, end: 4, notes: ["n"] },
    ]);
    expect(html).toContain('class="md-pt" data-c="9"');
  });

  it("marks the pending comment range with its own class", () => {
    const html = renderMarkdown("alpha beta", [
      { id: 0, start: 0, end: 5, notes: [] },
    ]);
    expect(html).toContain('class="md-hl md-pending" data-c="0"');
  });

  it("renders comments the same whoever wrote them", () => {
    const html = renderMarkdown("alpha beta", [
      { id: 1, start: 0, end: 5, notes: ["Questions:\n\n1. what does this mean?"] },
      { id: 2, start: 6, end: 6, notes: ["agent: point"] },
    ]);
    expect(html).toContain('class="md-hl" data-c="1"');
    expect(html).toContain('class="md-pt" data-c="2"');
    expect(html).not.toContain("md-agent");
  });

  it("escapes html in the source", () => {
    const html = renderMarkdown("<script>alert(1)</script>", []);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("marks escaped characters as unmapped spans", () => {
    const source = "a \\* b";
    const html = renderMarkdown(source, []);
    expect(html).toContain('data-s="2" data-e="4" data-m="0">*</span>');
  });
});

describe("unsafe links", () => {
  it("renders javascript, vbscript and data links as plain text", () => {
    for (const url of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "java\tscript:alert(1)", "vbscript:x", "data:text/html,<b>x</b>"]) {
      const html = renderMarkdown(`[click](${url})`, []);
      expect(html).not.toContain("<a ");
      expect(html).toContain("click");
    }
  });

  it("keeps normal links", () => {
    expect(renderMarkdown("[docs](https://example.com)", [])).toContain('<a href="https://example.com"');
    expect(renderMarkdown("[section](#goals)", [])).toContain('<a href="#goals"');
  });
});
