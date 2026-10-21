import type { ReviewComment } from "@/tools/md-builder/lib/critic-markup";
import {
  containsCriticMarkup,
  overlapsComment,
  sortComments,
} from "@/tools/md-builder/lib/critic-markup";

export interface ReviewDocument {
  name: string;
  source: string;
  comments: ReviewComment[];
  nextId: number;
}

export type NoteAuthor = "user" | "agent";

export type UserOp =
  | { kind: "comment"; id: number; start: number; end: number; note: string }
  | { kind: "reply"; threadId: number; note: string }
  | { kind: "edit-note"; threadId: number; noteIndex: number; note: string }
  | { kind: "delete-note"; threadId: number; noteIndex: number }
  | { kind: "resolve"; threadId: number }
  | { kind: "restore"; id: number; start: number; end: number; notes: string[] };

export type AgentCall =
  | { tool: "reply"; threadId: string; text: string }
  | { tool: "apply_change"; threadId: string; baseSeq: number; replacement: string }
  | { tool: "edit_text"; old: string; new: string }
  | { tool: "comment"; quote: string; text: string };

export type RejectionReason =
  | "unknown_thread"
  | "thread_resolved"
  | "new_activity"
  | "not_found"
  | "ambiguous"
  | "overlaps_thread"
  | "contains_markup"
  | "crosses_block"
  | "empty_text"
  | "stale_seq";

export type ActivityType =
  | "comment"
  | "reply"
  | "edit-note"
  | "delete-note"
  | "resolve"
  | "apply-change"
  | "edit-text";

export interface ActivityEvent {
  seq: number;
  actor: NoteAuthor;
  type: ActivityType;
  threadId: number | null;
  quote: string;
  note: string;
}

export interface SourceChange {
  from: number;
  to: number;
  insertLength: number;
}

export interface LiveLog {
  seq: number;
  firstSeq: number;
  events: ActivityEvent[];
  userActivity: Record<number, number>;
  resolvedIds: number[];
}

export type AgentOutcome =
  | {
      ok: true;
      published: ReviewDocument;
      log: LiveLog;
      change: SourceChange | null;
      threadId: number | null;
    }
  | { ok: false; reason: RejectionReason; message: string };

export interface DroppedOp {
  op: UserOp;
  text: string;
  reason: string;
}

export interface RebaseResult {
  view: ReviewDocument;
  pending: UserOp[];
  dropped: DroppedOp[];
  idRemap: Map<number, number>;
}

export const AGENT_PREFIX = "agent:";
export const MAX_EVENTS = 500;

const REJECTION_TEXT: Record<RejectionReason, string> = {
  unknown_thread: "there is no thread with that id. call get_document for the current threads.",
  thread_resolved: "that thread was already resolved.",
  new_activity:
    "the user added to that thread after the seq you read. call get_document, read their latest note, then decide again.",
  not_found: "that text is not in the document. call get_document and copy the text exactly.",
  ambiguous: "that text appears more than once. include more surrounding text so it matches once.",
  overlaps_thread:
    "that text overlaps a commented passage. use apply_change or reply on that thread instead.",
  contains_markup: "criticmarkup ({== ==}, {>> <<}) is not allowed in text you send.",
  crosses_block: "a comment can only cover text within one line.",
  empty_text: "the text is empty.",
  stale_seq:
    "md builder reloaded after you read the document, so thread ids and seq changed. call get_document and try again.",
};

export const DROPPED_TEXT = {
  threadGone: "this thread was resolved before your change reached it",
  textChanged: "the agent changed the text you commented on before you saved",
  overlaps: "the agent commented on the same text before you saved",
} as const;

export function emptyLog(firstSeq = 0): LiveLog {
  return { seq: firstSeq, firstSeq, events: [], userActivity: {}, resolvedIds: [] };
}

export function threadKey(id: number) {
  return `t${id}`;
}

export function parseThreadKey(key: string) {
  const match = /^t?(\d+)$/.exec(key.trim());
  return match ? Number(match[1]) : null;
}

export function authorOf(note: string): NoteAuthor {
  return note.trimStart().toLowerCase().startsWith(AGENT_PREFIX) ? "agent" : "user";
}

export function stripAuthor(note: string) {
  return authorOf(note) === "agent"
    ? note.trimStart().slice(AGENT_PREFIX.length).trimStart()
    : note;
}

const NOTE_TIME_PATTERN = /\s*<!--rg:([^>]*?)-->\s*$/;
const ANY_NOTE_TIME_PATTERN = /<!--rg:[^>]*?-->/g;

export function noteTimeMarker(at: string) {
  return `<!--rg:${at}-->`;
}

export function splitNoteTime(note: string) {
  const match = NOTE_TIME_PATTERN.exec(note);
  return match
    ? { text: note.slice(0, match.index), at: match[1] || null }
    : { text: note, at: null };
}

export function withNoteTime(text: string, at: string | null) {
  const clean = text.replace(ANY_NOTE_TIME_PATTERN, "").trim();
  return at ? `${clean}${noteTimeMarker(at)}` : clean;
}

export function agentNote(text: string, at: string | null = null) {
  return withNoteTime(`${AGENT_PREFIX} ${stripAuthor(text.replace(ANY_NOTE_TIME_PATTERN, "").trim())}`, at);
}

function reject(reason: RejectionReason): AgentOutcome {
  return { ok: false, reason, message: `rejected (${reason}): ${REJECTION_TEXT[reason]}` };
}

function occurrencesOf(source: string, text: string) {
  const positions: number[] = [];
  for (let index = source.indexOf(text); index >= 0; index = source.indexOf(text, index + 1)) {
    positions.push(index);
    if (positions.length > 1) break;
  }
  return positions;
}

export function mapPosition(position: number, change: SourceChange) {
  if (position <= change.from) return position;
  if (position >= change.to) return position + change.insertLength - (change.to - change.from);
  return null;
}

function touchesChange(start: number, end: number, change: SourceChange) {
  if (start === end) return start > change.from && start < change.to;
  return start < change.to && end > change.from;
}

function shiftComments(comments: ReviewComment[], change: SourceChange) {
  return comments.map((comment) => ({
    ...comment,
    start: mapPosition(comment.start, change) ?? comment.start,
    end: mapPosition(comment.end, change) ?? comment.end,
  }));
}

function applyChange(doc: ReviewDocument, change: SourceChange, insert: string): ReviewDocument {
  return {
    ...doc,
    source: doc.source.slice(0, change.from) + insert + doc.source.slice(change.to),
    comments: shiftComments(doc.comments, change),
  };
}

function quoteOf(doc: ReviewDocument, comment: ReviewComment) {
  return doc.source.slice(comment.start, comment.end);
}

function recordEvents(
  log: LiveLog,
  events: Omit<ActivityEvent, "seq">[]
): LiveLog {
  let seq = log.seq;
  const userActivity = { ...log.userActivity };
  const stamped = events.map((event) => {
    seq += 1;
    if (event.actor === "user" && event.threadId !== null) {
      userActivity[event.threadId] = seq;
    }
    return { ...event, seq };
  });
  return {
    ...log,
    seq,
    userActivity,
    events: [...log.events, ...stamped].slice(-MAX_EVENTS),
  };
}

function findThread(
  doc: ReviewDocument,
  log: LiveLog,
  key: string
): { thread: ReviewComment } | { reason: RejectionReason } {
  const id = parseThreadKey(key);
  const thread = id === null ? undefined : doc.comments.find((comment) => comment.id === id);
  if (thread) return { thread };
  if (id !== null && log.resolvedIds.includes(id)) return { reason: "thread_resolved" };
  return { reason: "unknown_thread" };
}

export function applyAgentCall(
  published: ReviewDocument,
  log: LiveLog,
  call: AgentCall,
  at: string | null = null
): AgentOutcome {
  if (call.tool === "reply") {
    const found = findThread(published, log, call.threadId);
    if (!("thread" in found)) return reject(found.reason);
    if (!call.text.trim()) return reject("empty_text");
    if (containsCriticMarkup(call.text)) return reject("contains_markup");
    const note = agentNote(call.text, at);
    const comments = published.comments.map((comment) =>
      comment.id === found.thread.id ? { ...comment, notes: [...comment.notes, note] } : comment
    );
    return {
      ok: true,
      published: { ...published, comments },
      log: recordEvents(log, [
        {
          actor: "agent",
          type: "reply",
          threadId: found.thread.id,
          quote: quoteOf(published, found.thread),
          note,
        },
      ]),
      change: null,
      threadId: found.thread.id,
    };
  }

  if (call.tool === "apply_change") {
    const found = findThread(published, log, call.threadId);
    if (call.baseSeq < log.firstSeq) return reject("stale_seq");
    if (!("thread" in found)) return reject(found.reason);
    if ((log.userActivity[found.thread.id] ?? 0) > call.baseSeq) return reject("new_activity");
    if (!call.replacement.trim()) return reject("empty_text");
    if (containsCriticMarkup(call.replacement)) return reject("contains_markup");
    if (call.replacement.includes("\n\n")) return reject("crosses_block");
    const change = {
      from: found.thread.start,
      to: found.thread.end,
      insertLength: call.replacement.length,
    };
    return {
      ok: true,
      published: applyChange(published, change, call.replacement),
      log: recordEvents(log, [
        {
          actor: "agent",
          type: "apply-change",
          threadId: found.thread.id,
          quote: quoteOf(published, found.thread),
          note: call.replacement,
        },
      ]),
      change,
      threadId: found.thread.id,
    };
  }

  if (call.tool === "edit_text") {
    if (!call.old) return reject("empty_text");
    if (containsCriticMarkup(call.new)) return reject("contains_markup");
    const positions = occurrencesOf(published.source, call.old);
    if (positions.length === 0) return reject("not_found");
    if (positions.length > 1) return reject("ambiguous");
    const change = { from: positions[0], to: positions[0] + call.old.length, insertLength: call.new.length };
    if (published.comments.some((comment) => touchesChange(comment.start, comment.end, change))) {
      return reject("overlaps_thread");
    }
    return {
      ok: true,
      published: applyChange(published, change, call.new),
      log: recordEvents(log, [
        { actor: "agent", type: "edit-text", threadId: null, quote: call.old, note: call.new },
      ]),
      change,
      threadId: null,
    };
  }

  if (!call.quote.trim() || !call.text.trim()) return reject("empty_text");
  if (call.quote.includes("\n")) return reject("crosses_block");
  if (containsCriticMarkup(call.text)) return reject("contains_markup");
  const positions = occurrencesOf(published.source, call.quote);
  if (positions.length === 0) return reject("not_found");
  if (positions.length > 1) return reject("ambiguous");
  const start = positions[0];
  const end = start + call.quote.length;
  if (overlapsComment(published.comments, start, end)) return reject("overlaps_thread");
  const id = published.nextId;
  const note = agentNote(call.text, at);
  return {
    ok: true,
    published: {
      ...published,
      nextId: id + 1,
      comments: [...published.comments, { id, start, end, notes: [note] }],
    },
    log: recordEvents(log, [{ actor: "agent", type: "comment", threadId: id, quote: call.quote, note }]),
    change: null,
    threadId: id,
  };
}

export function applyUserOp(doc: ReviewDocument, op: UserOp): ReviewDocument | null {
  if (op.kind === "restore") {
    if (op.start < 0 || op.end > doc.source.length || op.start > op.end || !op.notes.length) return null;
    if (overlapsComment(doc.comments, op.start, op.end)) return null;
    if (doc.comments.some((comment) => comment.id === op.id)) return null;
    return {
      ...doc,
      nextId: Math.max(doc.nextId, op.id + 1),
      comments: [...doc.comments, { id: op.id, start: op.start, end: op.end, notes: op.notes }],
    };
  }
  if (op.kind === "comment") {
    if (op.start < 0 || op.end > doc.source.length || op.start > op.end) return null;
    if (overlapsComment(doc.comments, op.start, op.end)) return null;
    if (doc.comments.some((comment) => comment.id === op.id)) return null;
    return {
      ...doc,
      nextId: Math.max(doc.nextId, op.id + 1),
      comments: [...doc.comments, { id: op.id, start: op.start, end: op.end, notes: [op.note] }],
    };
  }
  const thread = doc.comments.find((comment) => comment.id === op.threadId);
  if (!thread) return null;
  if (op.kind === "resolve") {
    return { ...doc, comments: doc.comments.filter((comment) => comment.id !== op.threadId) };
  }
  if (op.kind === "reply") {
    return {
      ...doc,
      comments: doc.comments.map((comment) =>
        comment.id === op.threadId ? { ...comment, notes: [...comment.notes, op.note] } : comment
      ),
    };
  }
  if (op.noteIndex < 0 || op.noteIndex >= thread.notes.length) return null;
  if (op.kind === "edit-note") {
    return {
      ...doc,
      comments: doc.comments.map((comment) =>
        comment.id === op.threadId
          ? {
              ...comment,
              notes: comment.notes.map((note, index) => (index === op.noteIndex ? op.note : note)),
            }
          : comment
      ),
    };
  }
  return {
    ...doc,
    comments: doc.comments.flatMap((comment) => {
      if (comment.id !== op.threadId) return [comment];
      const notes = comment.notes.filter((_, index) => index !== op.noteIndex);
      return notes.length ? [{ ...comment, notes }] : [];
    }),
  };
}

function textOf(op: UserOp) {
  if (op.kind === "restore") return op.notes.join("\n");
  if (op.kind === "delete-note" || op.kind === "resolve") return "";
  return op.note;
}

function droppedReason(op: UserOp, doc: ReviewDocument) {
  if (op.kind !== "comment" && op.kind !== "restore") return DROPPED_TEXT.threadGone;
  return overlapsComment(doc.comments, op.start, op.end) ? DROPPED_TEXT.overlaps : DROPPED_TEXT.textChanged;
}

export function mapPendingThroughChange(pending: UserOp[], change: SourceChange) {
  const kept: UserOp[] = [];
  const dropped: DroppedOp[] = [];
  for (const op of pending) {
    if (op.kind !== "comment" && op.kind !== "restore") {
      kept.push(op);
      continue;
    }
    const start = mapPosition(op.start, change);
    const end = mapPosition(op.end, change);
    if (start === null || end === null || touchesChange(op.start, op.end, change)) {
      dropped.push({ op, text: textOf(op), reason: DROPPED_TEXT.textChanged });
      continue;
    }
    kept.push({ ...op, start, end });
  }
  return { pending: kept, dropped };
}

function remapThreadId(op: UserOp, idRemap: Map<number, number>): UserOp {
  if (op.kind === "comment" || op.kind === "restore") return op;
  const threadId = idRemap.get(op.threadId);
  return threadId === undefined ? op : { ...op, threadId };
}

export function rebasePending(published: ReviewDocument, pending: UserOp[]): RebaseResult {
  const idRemap = new Map<number, number>();
  const kept: UserOp[] = [];
  const dropped: DroppedOp[] = [];
  let view = published;
  for (const original of pending) {
    let op = remapThreadId(original, idRemap);
    if (op.kind === "comment" || op.kind === "restore") {
      const commentId = op.id;
      if (view.comments.some((comment) => comment.id === commentId)) {
        idRemap.set(commentId, view.nextId);
        op = { ...op, id: view.nextId };
      }
    }
    const next = applyUserOp(view, op);
    if (!next) {
      dropped.push({ op, text: textOf(op), reason: droppedReason(op, view) });
      continue;
    }
    view = next;
    kept.push(op);
  }
  return { view, pending: kept, dropped, idRemap };
}

export function userEventsForSave(
  before: ReviewDocument,
  after: ReviewDocument,
  resolvedThreadIds: ReadonlySet<number> = new Set()
): Omit<ActivityEvent, "seq">[] {
  const events: Omit<ActivityEvent, "seq">[] = [];
  const beforeById = new Map(before.comments.map((comment) => [comment.id, comment]));
  for (const comment of sortComments(after.comments)) {
    const previous = beforeById.get(comment.id);
    const quote = after.source.slice(comment.start, comment.end);
    if (!previous) {
      comment.notes.forEach((note, index) =>
        events.push({ actor: "user", type: index === 0 ? "comment" : "reply", threadId: comment.id, quote, note })
      );
      continue;
    }
    previous.notes.forEach((note, index) => {
      const current = comment.notes[index];
      if (current !== undefined && current !== note) {
        events.push({ actor: "user", type: "edit-note", threadId: comment.id, quote, note: current });
      }
    });
    comment.notes.slice(previous.notes.length).forEach((note) =>
      events.push({ actor: "user", type: "reply", threadId: comment.id, quote, note })
    );
    if (comment.notes.length < previous.notes.length) {
      events.push({ actor: "user", type: "delete-note", threadId: comment.id, quote, note: "" });
    }
  }
  const afterIds = new Set(after.comments.map((comment) => comment.id));
  for (const comment of before.comments) {
    if (afterIds.has(comment.id)) continue;
    events.push({
      actor: "user",
      type: resolvedThreadIds.has(comment.id) ? "resolve" : "delete-note",
      threadId: comment.id,
      quote: before.source.slice(comment.start, comment.end),
      note: "",
    });
  }
  return events;
}

export function publishUserChanges(
  published: ReviewDocument,
  view: ReviewDocument,
  log: LiveLog,
  pending: UserOp[] = []
) {
  const resolvedThreadIds = new Set(
    pending.flatMap((op) => (op.kind === "resolve" ? [op.threadId] : []))
  );
  const recorded = recordEvents(log, userEventsForSave(published, view, resolvedThreadIds));
  return { ...recorded, resolvedIds: [...recorded.resolvedIds, ...resolvedThreadIds] };
}

export function reopenRange(doc: ReviewDocument, quote: string) {
  if (!quote) return null;
  const positions = occurrencesOf(doc.source, quote);
  if (positions.length !== 1) return null;
  const start = positions[0];
  const end = start + quote.length;
  return overlapsComment(doc.comments, start, end) ? null : { start, end };
}

export function userEventsSince(log: LiveLog, seq: number) {
  return log.events.filter((event) => event.actor === "user" && event.seq > seq);
}

function threadSignature(source: string, comment: ReviewComment) {
  return `${source.slice(comment.start, comment.end)}\u0000${comment.notes[0] ?? ""}`;
}

export function noteKeyFor(source: string, comment: ReviewComment, noteIndex: number) {
  return `${threadSignature(source, comment)}\u0000${noteIndex}`;
}

export function addedNoteKeys(before: ReviewDocument, after: ReviewDocument) {
  const previousBySignature = new Map<string, ReviewComment[]>();
  for (const comment of sortComments(before.comments)) {
    const signature = threadSignature(before.source, comment);
    previousBySignature.set(signature, [...(previousBySignature.get(signature) ?? []), comment]);
  }
  const keys: string[] = [];
  for (const comment of sortComments(after.comments)) {
    const previous = previousBySignature.get(threadSignature(after.source, comment))?.shift();
    comment.notes.forEach((note, index) => {
      if (previous?.notes[index] !== note) keys.push(noteKeyFor(after.source, comment, index));
    });
  }
  return keys;
}

function lineOf(source: string, offset: number) {
  let line = 1;
  for (let index = 0; index < offset; index++) {
    if (source[index] === "\n") line += 1;
  }
  return line;
}

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value : null;
}

export function agentCallFrom(tool: string, args: Record<string, unknown>): AgentCall | string {
  const missing = (key: string) => `missing or invalid argument: ${key}`;
  if (tool === "reply") {
    const threadId = stringArg(args, "threadId");
    const text = stringArg(args, "text");
    if (threadId === null) return missing("threadId");
    if (text === null) return missing("text");
    return { tool, threadId, text };
  }
  if (tool === "apply_change") {
    const threadId = stringArg(args, "threadId");
    const replacement = stringArg(args, "replacement");
    if (threadId === null) return missing("threadId");
    if (typeof args.baseSeq !== "number") return missing("baseSeq");
    if (replacement === null) return missing("replacement");
    return { tool, threadId, baseSeq: args.baseSeq, replacement };
  }
  if (tool === "edit_text") {
    const old = stringArg(args, "old");
    const replacement = stringArg(args, "new");
    if (old === null) return missing("old");
    if (replacement === null) return missing("new");
    return { tool, old, new: replacement };
  }
  if (tool === "comment") {
    const quote = stringArg(args, "quote");
    const text = stringArg(args, "text");
    if (quote === null) return missing("quote");
    if (text === null) return missing("text");
    return { tool, quote, text };
  }
  return `unknown tool: ${tool}`;
}

export function documentSnapshot(published: ReviewDocument, log: LiveLog) {
  return {
    name: published.name,
    seq: log.seq,
    markdown: published.source,
    threads: sortComments(published.comments).map((comment) => ({
      id: threadKey(comment.id),
      line: lineOf(published.source, comment.start),
      quote: published.source.slice(comment.start, comment.end),
      notes: comment.notes.map((note) => {
        const { text, at } = splitNoteTime(note);
        return { author: authorOf(text), text: stripAuthor(text), at };
      }),
    })),
  };
}

export function eventForAgent(event: ActivityEvent) {
  return {
    seq: event.seq,
    type: event.type,
    threadId: event.threadId === null ? null : threadKey(event.threadId),
    quote: event.quote,
    note: stripAuthor(splitNoteTime(event.note).text),
  };
}
