import { describe, expect, it } from "vitest";

import {
  exportCriticMarkup,
  parseCriticMarkup,
} from "@/tools/md-builder/lib/critic-markup";
import {
  addedNoteKeys,
  agentNote,
  applyAgentCall,
  applyUserOp,
  authorOf,
  documentSnapshot,
  imageRequestFrom,
  eventForAgent,
  DROPPED_TEXT,
  emptyLog,
  mapPendingThroughChange,
  noteKeyFor,
  parseThreadKey,
  publishUserChanges,
  rebasePending,
  reopenRange,
  splitNoteTime,
  trimQuote,
  withNoteTime,
  userEventsSince,
  type AgentCall,
  type LiveLog,
  type ReviewDocument,
  type UserOp,
} from "@/tools/md-builder/lib/live-sync";

function docFrom(markdown: string, name = "plan.md"): ReviewDocument {
  const parsed = parseCriticMarkup(markdown);
  return {
    name,
    source: parsed.source,
    comments: parsed.comments.map((comment, index) => ({ ...comment, id: index + 1 })),
    nextId: parsed.comments.length + 1,
  };
}

function markdownOf(doc: ReviewDocument) {
  return exportCriticMarkup(doc.source, doc.comments);
}

function applyOk(doc: ReviewDocument, log: LiveLog, call: AgentCall) {
  const outcome = applyAgentCall(doc, log, call);
  if (!outcome.ok) throw new Error(outcome.message);
  return outcome;
}

const BASE = docFrom(
  "Upload {==one at a time==}{>>why not three?<<} with retries.\n\nThe tray {==stays open==}{>>agent: it closes on done<<}{>>keep it open<<}."
);

describe("thread keys and authors", () => {
  it("parses thread keys with or without the t prefix", () => {
    expect(parseThreadKey("t3")).toBe(3);
    expect(parseThreadKey("3")).toBe(3);
    expect(parseThreadKey("x3")).toBeNull();
  });

  it("tells agent notes from user notes and never doubles the prefix", () => {
    expect(authorOf("agent: sure")).toBe("agent");
    expect(authorOf("Agent:sure")).toBe("agent");
    expect(authorOf("why?")).toBe("user");
    expect(agentNote("agent: done")).toBe("agent: done");
  });
});

describe("agent calls", () => {
  it("appends an agent reply to a thread", () => {
    const outcome = applyOk(BASE, emptyLog(), { tool: "reply", threadId: "t1", text: "three is fine" });
    expect(outcome.published.comments[0].notes).toEqual(["why not three?", "agent: three is fine"]);
    expect(outcome.log.seq).toBe(1);
    expect(outcome.log.events[0]).toMatchObject({ actor: "agent", type: "reply", threadId: 1 });
  });

  it("rejects unknown and resolved threads with different reasons", () => {
    expect(applyAgentCall(BASE, emptyLog(), { tool: "reply", threadId: "t9", text: "x" })).toMatchObject({
      ok: false,
      reason: "unknown_thread",
    });
    const view = applyUserOp(BASE, { kind: "resolve", threadId: 1 })!;
    const log = publishUserChanges(BASE, view, emptyLog(), [{ kind: "resolve", threadId: 1 }]);
    expect(applyAgentCall(view, log, { tool: "reply", threadId: "t1", text: "x" })).toMatchObject({
      ok: false,
      reason: "thread_resolved",
    });
  });

  it("applies an agreed change to the quoted text and keeps the thread open", () => {
    const outcome = applyOk(BASE, emptyLog(), {
      tool: "apply_change",
      threadId: "t1",
      baseSeq: 0,
      replacement: "three at a time",
    });
    expect(outcome.published.comments.map((comment) => comment.id)).toEqual([1, 2]);
    expect(markdownOf(outcome.published)).toBe(
      "Upload {==three at a time==}{>>why not three?<<} with retries.\n\nThe tray {==stays open==}{>>agent: it closes on done<<}{>>keep it open<<}."
    );
    expect(outcome.log.events[0]).toMatchObject({ type: "apply-change", quote: "one at a time" });
  });

  it("refuses a change over a user note the agent has not read", () => {
    const view = applyUserOp(BASE, { kind: "reply", threadId: 1, note: "actually wait" })!;
    const log = publishUserChanges(BASE, view, emptyLog());
    const change = { tool: "apply_change", threadId: "t1", replacement: "x" } as const;
    expect(applyAgentCall(view, log, { ...change, baseSeq: 0 })).toMatchObject({
      ok: false,
      reason: "new_activity",
    });
    expect(applyAgentCall(view, log, { ...change, baseSeq: log.seq }).ok).toBe(true);
  });

  it("refuses a change based on a seq from before md builder reloaded", () => {
    const reloaded = emptyLog(1000);
    expect(
      applyAgentCall(BASE, reloaded, { tool: "apply_change", threadId: "t1", baseSeq: 3, replacement: "x" })
    ).toMatchObject({ ok: false, reason: "stale_seq" });
    expect(
      applyAgentCall(BASE, reloaded, { tool: "apply_change", threadId: "t1", baseSeq: 1000, replacement: "x" }).ok
    ).toBe(true);
  });

  it("refuses empty, markup and multi-paragraph replacements", () => {
    const change = { tool: "apply_change", threadId: "t1", baseSeq: 0 } as const;
    expect(applyAgentCall(BASE, emptyLog(), { ...change, replacement: " " })).toMatchObject({ reason: "empty_text" });
    expect(applyAgentCall(BASE, emptyLog(), { ...change, replacement: "a{>>b<<}" })).toMatchObject({
      reason: "contains_markup",
    });
    expect(applyAgentCall(BASE, emptyLog(), { ...change, replacement: "a\n\nb" })).toMatchObject({
      reason: "crosses_block",
    });
  });

  it("edits text only when it matches once and stays clear of threads", () => {
    expect(applyAgentCall(BASE, emptyLog(), { tool: "edit_text", old: "missing", new: "x" })).toMatchObject({
      reason: "not_found",
    });
    expect(applyAgentCall(BASE, emptyLog(), { tool: "edit_text", old: "t", new: "x" })).toMatchObject({
      reason: "ambiguous",
    });
    expect(
      applyAgentCall(BASE, emptyLog(), { tool: "edit_text", old: "one at a time with", new: "x" })
    ).toMatchObject({ reason: "overlaps_thread" });
    expect(
      applyAgentCall(BASE, emptyLog(), { tool: "edit_text", old: "retries", new: "{==x==}" })
    ).toMatchObject({ reason: "contains_markup" });
    const outcome = applyOk(BASE, emptyLog(), { tool: "edit_text", old: "Upload", new: "Send each upload" });
    expect(markdownOf(outcome.published)).toContain("Send each upload {==one at a time==}");
  });

  it("opens an agent thread on a unique single-line quote", () => {
    const outcome = applyOk(BASE, emptyLog(), { tool: "comment", quote: "with retries", text: "how many?" });
    expect(outcome.threadId).toBe(3);
    expect(markdownOf(outcome.published)).toContain("{==with retries==}{>>agent: how many?<<}");
    expect(applyAgentCall(BASE, emptyLog(), { tool: "comment", quote: "retries.\n\nThe", text: "x" })).toMatchObject({
      reason: "crosses_block",
    });
    expect(applyAgentCall(BASE, emptyLog(), { tool: "comment", quote: "one at", text: "x" })).toMatchObject({
      reason: "overlaps_thread",
    });
  });
});

describe("unsaved user changes on top of agent changes", () => {
  it("keeps an unsaved reply when the agent replies to the same thread", () => {
    const pending: UserOp[] = [{ kind: "reply", threadId: 1, note: "mine" }];
    const agent = applyOk(BASE, emptyLog(), { tool: "reply", threadId: "t1", text: "theirs" });
    const rebased = rebasePending(agent.published, pending);
    expect(rebased.view.comments[0].notes).toEqual(["why not three?", "agent: theirs", "mine"]);
    expect(rebased.dropped).toEqual([]);
  });

  it("drops an unsaved reply to a thread that no longer exists and says why", () => {
    const pending: UserOp[] = [{ kind: "reply", threadId: 1, note: "mine" }];
    const withoutThread = applyUserOp(BASE, { kind: "resolve", threadId: 1 })!;
    const rebased = rebasePending(withoutThread, pending);
    expect(rebased.dropped).toEqual([{ op: pending[0], text: "mine", reason: DROPPED_TEXT.threadGone }]);
  });

  it("keeps an unsaved reply when the agent changes that thread's quoted text", () => {
    const pending: UserOp[] = [{ kind: "reply", threadId: 1, note: "looks good" }];
    const agent = applyOk(BASE, emptyLog(), {
      tool: "apply_change",
      threadId: "t1",
      baseSeq: 0,
      replacement: "three at a time",
    });
    const rebased = rebasePending(agent.published, mapPendingThroughChange(pending, agent.change!).pending);
    expect(rebased.view.comments[0].notes).toEqual(["why not three?", "looks good"]);
  });

  it("moves an unsaved comment when the agent edits text before it", () => {
    const start = BASE.source.indexOf("retries");
    const pending: UserOp[] = [{ kind: "comment", id: 3, start, end: start + 7, note: "how many" }];
    const agent = applyOk(BASE, emptyLog(), { tool: "edit_text", old: "Upload", new: "Send each upload" });
    const mapped = mapPendingThroughChange(pending, agent.change!);
    const rebased = rebasePending(agent.published, mapped.pending);
    const comment = rebased.view.comments.find((candidate) => candidate.id === 3)!;
    expect(rebased.view.source.slice(comment.start, comment.end)).toBe("retries");
  });

  it("drops an unsaved comment on text the agent rewrote", () => {
    const start = BASE.source.indexOf("Upload");
    const pending: UserOp[] = [{ kind: "comment", id: 3, start, end: start + 6, note: "verb?" }];
    const agent = applyOk(BASE, emptyLog(), { tool: "edit_text", old: "Upload", new: "Send" });
    const mapped = mapPendingThroughChange(pending, agent.change!);
    expect(mapped.pending).toEqual([]);
    expect(mapped.dropped[0].reason).toBe(DROPPED_TEXT.textChanged);
  });

  it("renumbers an unsaved comment whose id the agent took, and follows replies to it", () => {
    const start = BASE.source.indexOf("Upload");
    const pending: UserOp[] = [
      { kind: "comment", id: 3, start, end: start + 6, note: "verb?" },
      { kind: "reply", threadId: 3, note: "or send?" },
    ];
    const agent = applyOk(BASE, emptyLog(), { tool: "comment", quote: "with retries", text: "how many?" });
    const rebased = rebasePending(agent.published, pending);
    expect(rebased.idRemap.get(3)).toBe(4);
    const mine = rebased.view.comments.find((comment) => comment.id === 4)!;
    expect(mine.notes).toEqual(["verb?", "or send?"]);
    expect(rebased.view.comments.find((comment) => comment.id === 3)!.notes).toEqual(["agent: how many?"]);
  });
});

describe("activity", () => {
  it("records each saved user note once and lets the agent read only user events", () => {
    const view = [
      { kind: "reply", threadId: 1, note: "more" } as UserOp,
      { kind: "comment", id: 3, start: 0, end: 6, note: "verb?" } as UserOp,
    ].reduce<ReviewDocument>((doc, op) => applyUserOp(doc, op)!, BASE);
    const log = publishUserChanges(BASE, view, emptyLog());
    expect(log.events.map((event) => [event.type, event.threadId, event.note])).toEqual([
      ["comment", 3, "verb?"],
      ["reply", 1, "more"],
    ]);
    const agent = applyOk(view, log, { tool: "reply", threadId: "t3", text: "yes" });
    expect(userEventsSince(agent.log, 0)).toHaveLength(2);
    expect(userEventsSince(agent.log, agent.log.seq)).toHaveLength(0);
  });

  it("gives the agent clean markdown, thread ids, lines and authors", () => {
    const snapshot = documentSnapshot(BASE, emptyLog());
    expect(snapshot.markdown).not.toContain("{==");
    expect(snapshot.threads[1]).toEqual({
      id: "t2",
      line: 3,
      quote: "stays open",
      notes: [
        { author: "agent", text: "it closes on done", at: null },
        { author: "user", text: "keep it open", at: null },
      ],
    });
  });
  it("sends the agent the ends of a long quote and keeps the full text in the document", () => {
    const long = `${"a".repeat(400)}middle${"z".repeat(400)}`;
    const view = applyUserOp(docFrom(long), { kind: "comment", id: 1, start: 0, end: long.length, note: "all of it" })!;
    const log = publishUserChanges(docFrom(long), view, emptyLog());
    const event = eventForAgent(log.events[0]);
    expect(event.quote).toBe(`${"a".repeat(300)}…${"z".repeat(300)}`);
    expect(event.quoteLength).toBe(long.length);
    expect(documentSnapshot(view, log).threads[0].quote).toBe(long);
    expect(trimQuote("short")).toBe("short");
  });
});

describe("note timestamps", () => {
  const at = "2026-10-22T10:42:05Z";

  it("keeps the time inside the note so it round-trips through the file", () => {
    const view = applyUserOp(BASE, { kind: "reply", threadId: 2, note: withNoteTime("sounds good", at) })!;
    const markdown = markdownOf(view);
    expect(markdown).toContain("{>>sounds good<!--rg:2026-10-22T10:42:05Z--><<}");
    const reparsed = docFrom(markdown);
    expect(splitNoteTime(reparsed.comments[1].notes[2])).toEqual({ text: "sounds good", at });
  });

  it("stamps agent notes, strips markers agents try to write, and shows agents clean text with the time", () => {
    const outcome = applyOk(BASE, emptyLog(), {
      tool: "reply",
      threadId: "t1",
      text: "fine<!--rg:1999-01-01T00:00:00Z-->",
    });
    const replyWithTime = applyAgentCall(BASE, emptyLog(), { tool: "reply", threadId: "t1", text: "fine" }, at);
    expect(outcome.published.comments[0].notes[1]).toBe("agent: fine");
    expect(replyWithTime.ok && replyWithTime.published.comments[0].notes[1]).toBe(`agent: fine<!--rg:${at}-->`);
    const snapshot = documentSnapshot(replyWithTime.ok ? replyWithTime.published : BASE, emptyLog());
    expect(snapshot.threads[0].notes[1]).toEqual({ author: "agent", text: "fine", at });
  });

  it("reports no time for notes written without a marker", () => {
    expect(splitNoteTime("plain note")).toEqual({ text: "plain note", at: null });
  });
});

describe("resolving and reopening", () => {
  it("records a user resolve as a resolve event, not a delete", () => {
    const pending: UserOp[] = [{ kind: "resolve", threadId: 2 }];
    const view = applyUserOp(BASE, pending[0])!;
    const log = publishUserChanges(BASE, view, emptyLog(), pending);
    expect(log.events.map((event) => [event.type, event.threadId])).toEqual([["resolve", 2]]);
    expect(log.resolvedIds).toEqual([2]);
  });

  it("reopens a resolved thread on its quote when the text is still there once", () => {
    const view = applyUserOp(BASE, { kind: "resolve", threadId: 2 })!;
    const range = reopenRange(view, "stays open")!;
    const reopened = applyUserOp(view, {
      kind: "restore",
      id: view.nextId,
      ...range,
      notes: ["agent: it closes on done", "keep it open"],
    })!;
    expect(markdownOf(reopened)).toBe(markdownOf(BASE));
  });

  it("cannot reopen when the quote is gone, repeated or already commented", () => {
    expect(reopenRange(BASE, "not in the document")).toBeNull();
    expect(reopenRange(BASE, "t")).toBeNull();
    expect(reopenRange(BASE, "stays open")).toBeNull();
    expect(reopenRange(BASE, "")).toBeNull();
  });
});

describe("addedNoteKeys", () => {
  it("finds notes added to existing threads and whole new threads after a reload", () => {
    const after = docFrom(
      "Upload {==one at a time==}{>>why not three?<<}{>>agent: three is fine<<} with {==retries==}{>>agent: how many?<<}.\n\nThe tray {==stays open==}{>>agent: it closes on done<<}{>>keep it open<<}."
    );
    const [first, second] = [after.comments[0], after.comments[1]];
    expect(addedNoteKeys(BASE, after)).toEqual([
      noteKeyFor(after.source, first, 1),
      noteKeyFor(after.source, second, 0),
    ]);
  });

  it("treats an edited note as new", () => {
    const after = docFrom(markdownOf(BASE).replace("keep it open", "keep it open please"));
    expect(addedNoteKeys(BASE, after)).toEqual([noteKeyFor(after.source, after.comments[1], 1)]);
  });

  it("finds nothing when the file did not change", () => {
    expect(addedNoteKeys(BASE, docFrom(markdownOf(BASE)))).toEqual([]);
  });
});

function makeRandom(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const WORDS = ["alpha", "beta", "gamma", "delta", "omega", "sigma", "theta", "kappa"];

function randomCall(random: () => number, doc: ReviewDocument, log: LiveLog): AgentCall {
  const ids = doc.comments.map((comment) => comment.id);
  const anyId = () => `t${ids.length && random() < 0.8 ? ids[Math.floor(random() * ids.length)] : 99}`;
  const word = () => WORDS[Math.floor(random() * WORDS.length)];
  const pick = Math.floor(random() * 4);
  if (pick === 0) return { tool: "reply", threadId: anyId(), text: word() };
  if (pick === 1) return { tool: "apply_change", threadId: anyId(), baseSeq: log.seq, replacement: word() };
  if (pick === 2) return { tool: "edit_text", old: word(), new: `${word()} ${word()}` };
  return { tool: "comment", quote: word(), text: word() };
}

function randomUserOp(random: () => number, view: ReviewDocument): UserOp | null {
  const comments = view.comments;
  const pick = Math.floor(random() * 4);
  if (pick === 0 || !comments.length) {
    const word = WORDS[Math.floor(random() * WORDS.length)];
    const start = view.source.indexOf(word);
    if (start < 0) return null;
    return { kind: "comment", id: view.nextId, start, end: start + word.length, note: `on ${word}` };
  }
  const thread = comments[Math.floor(random() * comments.length)];
  if (pick === 1) return { kind: "reply", threadId: thread.id, note: "user reply" };
  if (pick === 3) return { kind: "resolve", threadId: thread.id };
  return { kind: "delete-note", threadId: thread.id, noteIndex: thread.notes.length - 1 };
}

describe("interleaving fuzz", () => {
  it("always produces a document that round-trips with unique thread ids", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const random = makeRandom(seed);
      let published = docFrom(WORDS.join(" ") + "\n\n" + WORDS.slice().reverse().join(" "));
      let log = emptyLog();
      let pending: UserOp[] = [];
      let view = published;

      for (let step = 0; step < 40; step++) {
        if (random() < 0.5) {
          const op = randomUserOp(random, view);
          const next = op ? applyUserOp(view, op) : null;
          if (op && next) {
            pending = [...pending, op];
            view = next;
          }
        } else if (random() < 0.8) {
          const outcome = applyAgentCall(published, log, randomCall(random, published, log));
          if (outcome.ok) {
            published = outcome.published;
            log = outcome.log;
            if (outcome.change) {
              pending = mapPendingThroughChange(pending, outcome.change).pending;
            }
            const rebased = rebasePending(published, pending);
            pending = rebased.pending;
            view = rebased.view;
          }
        } else {
          log = publishUserChanges(published, view, log);
          published = view;
          pending = [];
        }

        const reparsed = parseCriticMarkup(markdownOf(view));
        expect(reparsed.source).toBe(view.source);
        expect(reparsed.comments.map((comment) => comment.notes)).toEqual(
          [...view.comments].sort((a, b) => a.start - b.start || a.end - b.end).map((comment) => comment.notes)
        );
        expect(new Set(view.comments.map((comment) => comment.id)).size).toBe(view.comments.length);
      }
    }
  });
});

describe("add_image", () => {
  const image = "![meme](images/meme.png)";

  it("puts the image on its own paragraph after the line that holds the anchor", () => {
    const outcome = applyOk(BASE, emptyLog(), { tool: "add_image", after: "with retries", markdown: image });
    expect(outcome.published.source).toBe(
      "Upload one at a time with retries.\n\n![meme](images/meme.png)\n\nThe tray stays open."
    );
    expect(outcome.published.comments.map((comment) => outcome.published.source.slice(comment.start, comment.end))).toEqual([
      "one at a time",
      "stays open",
    ]);
  });

  it("separates the image from a next line that follows directly, and appends at the end", () => {
    const doc = docFrom("# Title\nfirst line");
    expect(applyOk(doc, emptyLog(), { tool: "add_image", after: "Title", markdown: image }).published.source).toBe(
      "# Title\n\n![meme](images/meme.png)\n\nfirst line"
    );
    expect(applyOk(doc, emptyLog(), { tool: "add_image", after: "first", markdown: image }).published.source).toBe(
      "# Title\nfirst line\n\n![meme](images/meme.png)"
    );
  });

  it("rejects anchors that are missing, repeated or inside a thread that spans lines", () => {
    expect(applyAgentCall(BASE, emptyLog(), { tool: "add_image", after: "nope", markdown: image })).toMatchObject({ reason: "not_found" });
    expect(applyAgentCall(BASE, emptyLog(), { tool: "add_image", after: "t", markdown: image })).toMatchObject({ reason: "ambiguous" });
    const spanning = docFrom("{==first\nsecond==}{>>both lines<<}");
    expect(applyAgentCall(spanning, emptyLog(), { tool: "add_image", after: "first", markdown: image })).toMatchObject({
      reason: "overlaps_thread",
    });
  });

  it("reads add_image arguments and keeps brackets and line breaks out of the alt text", () => {
    expect(imageRequestFrom({ path: " docs/a.png ", after: "x", alt: "a [b]\nc" })).toEqual({
      path: "docs/a.png",
      alt: "a  b  c",
      after: "x",
      documentPath: null,
    });
    expect(imageRequestFrom({ after: "x" })).toBe("missing or invalid argument: path");
  });
});
