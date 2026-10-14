export interface CommentRange {
  start: number;
  end: number;
  notes: string[];
}

export interface ReviewComment extends CommentRange {
  id: number;
}

export interface ParsedDocument {
  source: string;
  comments: CommentRange[];
}

const NOTE_RUN = "(?:\\{>>[\\s\\S]*?<<\\})+";
const CRITIC_PATTERN = new RegExp(
  `\\{==([\\s\\S]*?)==\\}(${NOTE_RUN})|(${NOTE_RUN})`,
  "g"
);
const NOTE_PATTERN = /\{>>([\s\S]*?)<<\}/g;
const MARKUP_PATTERN = /==\}|\{==|<<\}|\{>>/;

function notesOf(run: string) {
  return [...run.matchAll(NOTE_PATTERN)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

export function parseCriticMarkup(text: string): ParsedDocument {
  const normalized = text.replace(/\r\n/g, "\n");
  let source = "";
  let consumedUpTo = 0;
  const comments: CommentRange[] = [];
  CRITIC_PATTERN.lastIndex = 0;

  for (
    let match = CRITIC_PATTERN.exec(normalized);
    match;
    match = CRITIC_PATTERN.exec(normalized)
  ) {
    source += normalized.slice(consumedUpTo, match.index);
    const start = source.length;
    if (match[1] !== undefined) {
      source += match[1];
      comments.push({ start, end: source.length, notes: notesOf(match[2]) });
    } else {
      comments.push({ start, end: start, notes: notesOf(match[3]) });
    }
    consumedUpTo = match.index + match[0].length;
  }

  source += normalized.slice(consumedUpTo);
  return { source, comments: comments.filter((comment) => comment.notes.length) };
}

export function sortComments<T extends CommentRange>(comments: T[]): T[] {
  return [...comments].sort(
    (first, second) => first.start - second.start || first.end - second.end
  );
}

function escapeNote(note: string) {
  return note.replace(/<<\}/g, "<< }");
}

export function exportCriticMarkup(
  source: string,
  comments: CommentRange[]
): string {
  let output = "";
  let position = 0;
  for (const comment of sortComments(comments)) {
    const notes = comment.notes
      .map((note) => `{>>${escapeNote(note)}<<}`)
      .join("");
    output += source.slice(position, comment.start);
    output +=
      comment.end > comment.start
        ? `{==${source.slice(comment.start, comment.end)}==}${notes}`
        : notes;
    position = comment.end;
  }
  return output + source.slice(position);
}

export function containsCriticMarkup(text: string) {
  return MARKUP_PATTERN.test(text);
}

export function overlapsComment(
  comments: CommentRange[],
  start: number,
  end: number
) {
  return comments.some(
    (comment) => comment.start < end && comment.end > start
  );
}

export function excerptOf(
  source: string,
  comment: CommentRange,
  maxLength: number
) {
  const text = source
    .slice(comment.start, comment.end)
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}…` : text;
}
