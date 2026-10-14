import type { ReviewComment } from "@/tools/md-builder/lib/critic-markup";
import { sortComments } from "@/tools/md-builder/lib/critic-markup";

export const SOURCE_START_ATTR = "data-s";
export const SOURCE_END_ATTR = "data-e";
export const SOURCE_MAPPED_ATTR = "data-m";
export const COMMENT_ID_ATTR = "data-c";

export const HIGHLIGHT_CLASS = "md-hl";
export const PENDING_CLASS = "md-pending";
export const POINT_CLASS = "md-pt";
export const PENDING_COMMENT_ID = 0;

export const AGENT_CLASS = "md-agent";

const POINT_ICON =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

export interface RenderOptions {
  agentCommentIds?: ReadonlySet<number>;
}

interface SourceLine {
  text: string;
  offset: number;
}

interface InlinePiece {
  from: number;
  to: number;
  offset: number;
}

interface TableCell {
  text: string;
  offset: number;
}

interface RenderContext {
  comments: ReviewComment[];
  emittedPoints: Set<number>;
  agentCommentIds: ReadonlySet<number>;
}

const LIST_PATTERN = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)(.*)$/;
const RULE_PATTERN = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const FENCE_PATTERN = /^(\s*)(`{3,}|~{3,})(.*)$/;
const HEADING_PATTERN = /^(\s{0,3}#{1,6})(\s+|$)/;
const TABLE_DELIMITER_PATTERN =
  /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const QUOTE_PATTERN = /^\s{0,3}>/;
const LIST_START_PATTERN =
  /^\s*([-*+]|\d{1,9}[.)])\s+\S|^\s*([-*+]|\d{1,9}[.)])\s*$/;
const TASK_PATTERN = /^\[([ xX])\]\s+/;
const ESCAPABLE_PATTERN = /[!-/:-@[-`{-~]/;
const WORD_PATTERN = /[A-Za-z0-9]/;
const AUTOLINK_PATTERN = /^<(https?:\/\/[^>\s]+)>/;
const BARE_URL_PATTERN = /^https?:\/\/[^\s<]*[^\s<).,;:!?'"]/;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(text: string) {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function indentOf(text: string) {
  return text.length - text.replace(/^\s+/, "").length;
}

function isBlank(text: string) {
  return /^\s*$/.test(text);
}

function isWordCharacter(character: string | undefined) {
  return character !== undefined && WORD_PATTERN.test(character);
}

function isSpaceCharacter(character: string | undefined) {
  return character === undefined || /\s/.test(character);
}

function isFenceWithoutBackticks(text: string) {
  const fence = FENCE_PATTERN.exec(text);
  return Boolean(fence) && !/`/.test(fence![3]);
}

function startsBlock(text: string) {
  return (
    HEADING_PATTERN.test(text) ||
    RULE_PATTERN.test(text) ||
    QUOTE_PATTERN.test(text) ||
    isFenceWithoutBackticks(text) ||
    /^\s{0,3}([-*+]|\d{1,9}[.)])\s+\S/.test(text)
  );
}

function toneClass(context: RenderContext, id: number) {
  return context.agentCommentIds.has(id) ? ` ${AGENT_CLASS}` : "";
}

function pointMarker(context: RenderContext, id: number) {
  return `<span class="${POINT_CLASS}${toneClass(context, id)}" ${COMMENT_ID_ATTR}="${id}" title="comment">${POINT_ICON}</span>`;
}

function textSpan(
  context: RenderContext,
  start: number,
  end: number,
  shown: string,
  isMapped: boolean,
  comment: ReviewComment | null
) {
  const highlightClass =
    comment?.id === PENDING_COMMENT_ID
      ? `${HIGHLIGHT_CLASS} ${PENDING_CLASS}`
      : `${HIGHLIGHT_CLASS}${comment ? toneClass(context, comment.id) : ""}`;
  const highlight = comment
    ? ` class="${highlightClass}" ${COMMENT_ID_ATTR}="${comment.id}"`
    : "";
  return `<span${highlight} ${SOURCE_START_ATTR}="${start}" ${SOURCE_END_ATTR}="${end}" ${SOURCE_MAPPED_ATTR}="${isMapped ? 1 : 0}">${escapeHtml(shown)}</span>`;
}

function renderSourceRange(
  context: RenderContext,
  start: number,
  end: number,
  shown: string,
  isMapped: boolean
) {
  const ranged = context.comments.filter(
    (comment) =>
      comment.end > comment.start && comment.end > start && comment.start < end
  );
  const points = context.comments.filter(
    (comment) =>
      comment.start === comment.end &&
      comment.start >= start &&
      comment.start <= end &&
      !context.emittedPoints.has(comment.id)
  );

  const emitPointsAt = (offset: number) => {
    let html = "";
    for (const point of points) {
      if (point.start !== offset || context.emittedPoints.has(point.id)) {
        continue;
      }
      context.emittedPoints.add(point.id);
      html += pointMarker(context, point.id);
    }
    return html;
  };

  if (!isMapped) {
    let html = "";
    for (const point of points) {
      if (point.start < end) {
        context.emittedPoints.add(point.id);
        html += pointMarker(context, point.id);
      }
    }
    return html + textSpan(context, start, end, shown, false, ranged[0] ?? null);
  }

  const cuts = new Set<number>([start, end]);
  for (const comment of ranged) {
    cuts.add(Math.max(comment.start, start));
    cuts.add(Math.min(comment.end, end));
  }
  for (const point of points) cuts.add(point.start);
  const boundaries = [...cuts].sort((first, second) => first - second);

  let html = "";
  for (let index = 0; index < boundaries.length - 1; index++) {
    const from = boundaries[index];
    const to = boundaries[index + 1];
    html += emitPointsAt(from);
    const owner =
      ranged.find((comment) => comment.start <= from && comment.end >= to) ??
      null;
    html += textSpan(context, 
      from,
      to,
      shown.slice(from - start, to - start),
      true,
      owner
    );
  }
  if (end === start) {
    html += emitPointsAt(start);
    html += textSpan(context, start, end, "", true, null);
  } else {
    html += emitPointsAt(end);
  }
  return html;
}

function renderInline(
  context: RenderContext,
  text: string,
  pieces: InlinePiece[]
) {
  const sourceOffsetAt = (index: number) => {
    for (const piece of pieces) {
      if (index >= piece.from && index < piece.to) {
        return piece.offset + (index - piece.from);
      }
    }
    const last = pieces[pieces.length - 1];
    return last.offset + (index - last.from);
  };

  const renderRun = (from: number, to: number) => {
    let html = "";
    for (const piece of pieces) {
      const start = Math.max(from, piece.from);
      const end = Math.min(to, piece.to);
      if (start < end) {
        html += renderSourceRange(
          context,
          piece.offset + (start - piece.from),
          piece.offset + (end - piece.from),
          text.slice(start, end),
          true
        );
      }
    }
    return html;
  };

  function findClosing(
    delimiter: string,
    from: number,
    limit: number,
    isSingle: boolean
  ) {
    let index = from;
    for (;;) {
      index = text.indexOf(delimiter, index);
      if (index < 0 || index >= limit) return -1;
      const before = text[index - 1];
      const after = text[index + delimiter.length];
      const okBefore = index > from && !isSpaceCharacter(before);
      const okSingle =
        !isSingle || (after !== delimiter[0] && before !== delimiter[0]);
      const okWord = delimiter[0] !== "_" || !isWordCharacter(after);
      if (okBefore && okSingle && okWord) return index;
      index += 1;
    }
  }

  function matchBracket(
    open: string,
    close: string,
    from: number,
    limit: number
  ) {
    let depth = 0;
    for (let index = from; index < limit; index++) {
      if (text[index] === "\\") {
        index++;
        continue;
      }
      if (text[index] === open) depth++;
      else if (text[index] === close && --depth === 0) return index;
    }
    return -1;
  }

  function findCodeClose(fence: string, from: number, limit: number) {
    for (let searchFrom = from; ; ) {
      const index = text.indexOf(fence, searchFrom);
      if (index < 0 || index >= limit) return -1;
      if (text[index + fence.length] !== "`" && text[index - 1] !== "`") {
        return index;
      }
      searchFrom = index + 1;
    }
  }

  function parse(from: number, limit: number): string {
    let html = "";
    let plainFrom = from;
    let index = from;
    const flush = (upTo: number) => {
      if (upTo > plainFrom) html += renderRun(plainFrom, upTo);
    };

    while (index < limit) {
      const character = text[index];

      if (
        character === "\\" &&
        index + 1 < limit &&
        ESCAPABLE_PATTERN.test(text[index + 1])
      ) {
        flush(index);
        const offset = sourceOffsetAt(index);
        html += renderSourceRange(
          context,
          offset,
          offset + 2,
          text[index + 1],
          false
        );
        index += 2;
        plainFrom = index;
        continue;
      }

      if (character === "`") {
        let fenceLength = 0;
        while (text[index + fenceLength] === "`") fenceLength++;
        const close = findCodeClose(
          "`".repeat(fenceLength),
          index + fenceLength,
          limit
        );
        if (close > 0) {
          flush(index);
          html += `<code>${renderRun(index + fenceLength, close)}</code>`;
          index = close + fenceLength;
          plainFrom = index;
          continue;
        }
        index += fenceLength;
        continue;
      }

      if (character === "!" && text[index + 1] === "[") {
        const closeBracket = matchBracket("[", "]", index + 1, limit);
        if (closeBracket > 0 && text[closeBracket + 1] === "(") {
          const closeParen = matchBracket("(", ")", closeBracket + 1, limit);
          if (closeParen > 0) {
            flush(index);
            const alt = text.slice(index + 2, closeBracket) || "image";
            html += `<span class="md-img">${escapeHtml(alt)}</span>`;
            index = closeParen + 1;
            plainFrom = index;
            continue;
          }
        }
      }

      if (character === "[") {
        const closeBracket = matchBracket("[", "]", index, limit);
        if (closeBracket > 0 && text[closeBracket + 1] === "(") {
          const closeParen = matchBracket("(", ")", closeBracket + 1, limit);
          if (closeParen > 0) {
            const url = text
              .slice(closeBracket + 2, closeParen)
              .trim()
              .replace(/\s+["'(].*$/, "");
            flush(index);
            html += `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${parse(index + 1, closeBracket)}</a>`;
            index = closeParen + 1;
            plainFrom = index;
            continue;
          }
        }
      }

      if (character === "<") {
        const autolink = AUTOLINK_PATTERN.exec(text.slice(index, limit));
        if (autolink) {
          flush(index);
          html += `<a href="${escapeAttribute(autolink[1])}" target="_blank" rel="noopener noreferrer">${renderRun(index + 1, index + autolink[0].length - 1)}</a>`;
          index += autolink[0].length;
          plainFrom = index;
          continue;
        }
      }

      if (character === "h" && !isWordCharacter(text[index - 1])) {
        const url = BARE_URL_PATTERN.exec(text.slice(index, limit));
        if (url) {
          flush(index);
          html += `<a href="${escapeAttribute(url[0])}" target="_blank" rel="noopener noreferrer">${renderRun(index, index + url[0].length)}</a>`;
          index += url[0].length;
          plainFrom = index;
          continue;
        }
      }

      const pair = text.slice(index, index + 2);
      if (
        (pair === "**" || pair === "__" || pair === "~~") &&
        !isSpaceCharacter(text[index + 2]) &&
        !(pair === "__" && isWordCharacter(text[index - 1]))
      ) {
        const close = findClosing(pair, index + 2, limit, false);
        if (close > 0) {
          flush(index);
          const tag = pair === "~~" ? "del" : "strong";
          html += `<${tag}>${parse(index + 2, close)}</${tag}>`;
          index = close + 2;
          plainFrom = index;
          continue;
        }
      }

      if (
        (character === "*" || character === "_") &&
        text[index + 1] !== character &&
        !isSpaceCharacter(text[index + 1]) &&
        !(character === "_" && isWordCharacter(text[index - 1]))
      ) {
        const close = findClosing(character, index + 1, limit, true);
        if (close > 0) {
          flush(index);
          html += `<em>${parse(index + 1, close)}</em>`;
          index = close + 1;
          plainFrom = index;
          continue;
        }
      }

      index++;
    }

    flush(limit);
    return html;
  }

  return parse(0, text.length);
}

function renderLineInline(
  context: RenderContext,
  text: string,
  offset: number
) {
  return renderInline(context, text, [{ from: 0, to: text.length, offset }]);
}

export function splitSourceLines(source: string): SourceLine[] {
  let offset = 0;
  return source.split("\n").map((raw) => {
    const line = {
      text: raw.endsWith("\r") ? raw.slice(0, -1) : raw,
      offset,
    };
    offset += raw.length + 1;
    return line;
  });
}

function splitTableRow(line: SourceLine): TableCell[] {
  const { text } = line;
  const cells: TableCell[] = [];
  let start = 0;
  let end = text.length;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (text[start] === "|") start++;
  if (end > start && text[end - 1] === "|" && text[end - 2] !== "\\") end--;

  let cellStart = start;
  for (let index = start; index <= end; index++) {
    if (index === end || (text[index] === "|" && text[index - 1] !== "\\")) {
      let from = cellStart;
      let to = index;
      while (from < to && /\s/.test(text[from])) from++;
      while (to > from && /\s/.test(text[to - 1])) to--;
      cells.push({ text: text.slice(from, to), offset: line.offset + from });
      cellStart = index + 1;
    }
  }
  return cells;
}

function alignmentOf(cell: TableCell) {
  const startsColon = cell.text.startsWith(":");
  const endsColon = cell.text.endsWith(":");
  if (startsColon && endsColon) return "center";
  if (startsColon) return "left";
  if (endsColon) return "right";
  return "";
}

function renderTable(
  context: RenderContext,
  lines: SourceLine[],
  startIndex: number
) {
  const head = splitTableRow(lines[startIndex]);
  const alignments = splitTableRow(lines[startIndex + 1]).map(alignmentOf);
  const renderCell = (tag: string, cell: TableCell, column: number) => {
    const style = alignments[column]
      ? ` style="text-align:${alignments[column]}"`
      : "";
    const body = cell.text
      ? renderInline(context, cell.text, [
          { from: 0, to: cell.text.length, offset: cell.offset },
        ])
      : "";
    return `<${tag}${style}>${body}</${tag}>`;
  };

  let html = `<table><thead><tr>${head
    .map((cell, column) => renderCell("th", cell, column))
    .join("")}</tr></thead><tbody>`;
  let index = startIndex + 2;
  while (
    index < lines.length &&
    !isBlank(lines[index].text) &&
    lines[index].text.includes("|")
  ) {
    html += `<tr>${splitTableRow(lines[index])
      .map((cell, column) => renderCell("td", cell, column))
      .join("")}</tr>`;
    index++;
  }
  return { html: `${html}</tbody></table>`, next: index };
}

function renderList(
  context: RenderContext,
  lines: SourceLine[],
  startIndex: number
) {
  const first = LIST_PATTERN.exec(lines[startIndex].text)!;
  const baseIndent = first[1].length;
  const isOrdered = /\d/.test(first[2][0]);
  const startNumber = isOrdered ? parseInt(first[2], 10) : 1;
  const isSibling = (text: string) => {
    const match = LIST_PATTERN.exec(text);
    return Boolean(
      match &&
        !RULE_PATTERN.test(text) &&
        match[1].length === baseIndent &&
        /\d/.test(match[2][0]) === isOrdered
    );
  };

  let html = "";
  let index = startIndex;
  while (index < lines.length && isSibling(lines[index].text)) {
    const match = LIST_PATTERN.exec(lines[index].text)!;
    const contentIndent = Math.min(
      match[1].length + match[2].length + Math.min(match[3].length, 4),
      lines[index].text.length
    );
    const item: SourceLine[] = [
      {
        text: lines[index].text.slice(contentIndent),
        offset: lines[index].offset + contentIndent,
      },
    ];
    index++;

    while (index < lines.length) {
      const line = lines[index];
      if (isBlank(line.text)) {
        let lookahead = index;
        while (lookahead < lines.length && isBlank(lines[lookahead].text)) {
          lookahead++;
        }
        if (
          lookahead < lines.length &&
          indentOf(lines[lookahead].text) >= contentIndent
        ) {
          for (; index < lookahead; index++) {
            item.push({ text: "", offset: lines[index].offset });
          }
          continue;
        }
        break;
      }
      if (indentOf(line.text) >= contentIndent) {
        item.push({
          text: line.text.slice(contentIndent),
          offset: line.offset + contentIndent,
        });
        index++;
        continue;
      }
      const previous = item[item.length - 1];
      if (
        !isBlank(previous.text) &&
        !startsBlock(line.text) &&
        !LIST_PATTERN.test(line.text)
      ) {
        const lead = indentOf(line.text);
        item.push({ text: line.text.slice(lead), offset: line.offset + lead });
        index++;
        continue;
      }
      break;
    }

    let lookahead = index;
    while (lookahead < lines.length && isBlank(lines[lookahead].text)) {
      lookahead++;
    }
    if (
      lookahead > index &&
      lookahead < lines.length &&
      isSibling(lines[lookahead].text)
    ) {
      index = lookahead;
    }

    let itemClass = "";
    let checkbox = "";
    const task = TASK_PATTERN.exec(item[0].text);
    if (task) {
      itemClass = ' class="md-task"';
      checkbox = `<input type="checkbox" disabled${task[1] === " " ? "" : " checked"}>`;
      item[0] = {
        text: item[0].text.slice(task[0].length),
        offset: item[0].offset + task[0].length,
      };
    }
    html += `<li${itemClass}>${checkbox}${renderBlocks(context, item)}</li>`;
  }

  const tag = isOrdered ? "ol" : "ul";
  const startAttribute =
    isOrdered && startNumber !== 1 ? ` start="${startNumber}"` : "";
  return { html: `<${tag}${startAttribute}>${html}</${tag}>`, next: index };
}

function renderFence(
  context: RenderContext,
  lines: SourceLine[],
  startIndex: number,
  fence: RegExpExecArray
) {
  const marker = fence[2][0];
  const closePattern = new RegExp(
    `^\\s*${marker === "`" ? "`" : "~"}{${fence[2].length},}\\s*$`
  );
  const language = fence[3].trim().split(/\s+/)[0];
  const indent = fence[1].length;
  let body = "";
  let index = startIndex + 1;
  while (index < lines.length && !closePattern.test(lines[index].text)) {
    const cut = Math.min(indent, indentOf(lines[index].text));
    const text = lines[index].text.slice(cut);
    if (text) {
      const start = lines[index].offset + cut;
      body += renderSourceRange(context, start, start + text.length, text, true);
    }
    body += "\n";
    index++;
  }
  const languageClass = language
    ? ` class="lang-${escapeAttribute(language)}"`
    : "";
  return {
    html: `<pre><code${languageClass}>${body}</code></pre>`,
    next: index + 1,
  };
}

function renderBlocks(context: RenderContext, lines: SourceLine[]): string {
  let html = "";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line.text)) {
      index++;
      continue;
    }

    const fence = FENCE_PATTERN.exec(line.text);
    if (fence && !(fence[2][0] === "`" && fence[3].includes("`"))) {
      const block = renderFence(context, lines, index, fence);
      html += block.html;
      index = block.next;
      continue;
    }

    const heading = HEADING_PATTERN.exec(line.text);
    if (heading) {
      const level = heading[1].trim().length;
      const content = line.text
        .slice(heading[0].length)
        .replace(/\s+#+\s*$/, "");
      const body = content
        ? renderLineInline(context, content, line.offset + heading[0].length)
        : "";
      html += `<h${level}>${body}</h${level}>`;
      index++;
      continue;
    }

    if (RULE_PATTERN.test(line.text)) {
      html += "<hr>";
      index++;
      continue;
    }

    if (QUOTE_PATTERN.test(line.text)) {
      const inner: SourceLine[] = [];
      while (index < lines.length && QUOTE_PATTERN.test(lines[index].text)) {
        const cut = /^\s{0,3}> ?/.exec(lines[index].text)![0].length;
        inner.push({
          text: lines[index].text.slice(cut),
          offset: lines[index].offset + cut,
        });
        index++;
      }
      html += `<blockquote>${renderBlocks(context, inner)}</blockquote>`;
      continue;
    }

    if (LIST_PATTERN.test(line.text) && LIST_START_PATTERN.test(line.text)) {
      const block = renderList(context, lines, index);
      html += block.html;
      index = block.next;
      continue;
    }

    if (
      line.text.includes("|") &&
      index + 1 < lines.length &&
      TABLE_DELIMITER_PATTERN.test(lines[index + 1].text) &&
      lines[index + 1].text.includes("-")
    ) {
      const block = renderTable(context, lines, index);
      html += block.html;
      index = block.next;
      continue;
    }

    const paragraph: SourceLine[] = [];
    while (
      index < lines.length &&
      !isBlank(lines[index].text) &&
      (paragraph.length === 0 || !startsBlock(lines[index].text))
    ) {
      paragraph.push(lines[index]);
      index++;
    }
    let text = "";
    const pieces: InlinePiece[] = [];
    paragraph.forEach((paragraphLine, position) => {
      const lead = indentOf(paragraphLine.text);
      const part =
        paragraphLine.text.slice(lead) +
        (position < paragraph.length - 1 ? "\n" : "");
      pieces.push({
        from: text.length,
        to: text.length + part.length,
        offset: paragraphLine.offset + lead,
      });
      text += part;
    });
    html += `<p>${renderInline(context, text.replace(/\s+$/, ""), pieces)}</p>`;
  }

  return html;
}

export function renderMarkdown(
  source: string,
  comments: ReviewComment[],
  options: RenderOptions = {}
): string {
  const context: RenderContext = {
    comments: sortComments(comments),
    emittedPoints: new Set(),
    agentCommentIds: options.agentCommentIds ?? new Set(),
  };
  let html = renderBlocks(context, splitSourceLines(source));
  for (const comment of context.comments) {
    const isEmitted =
      comment.start === comment.end
        ? context.emittedPoints.has(comment.id)
        : html.includes(`${COMMENT_ID_ATTR}="${comment.id}"`);
    if (!isEmitted) html += pointMarker(context, comment.id);
  }
  return html;
}
