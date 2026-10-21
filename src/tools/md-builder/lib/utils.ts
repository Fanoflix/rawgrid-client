import { hasModKey } from "@/lib/utils";
import {
  COMMENT_SHORTCUT,
  MD_BUILDER_TEXT,
} from "@/tools/md-builder/lib/constants";

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function scrollToCenter(
  container: HTMLElement,
  target: HTMLElement,
  durationMs: number,
  onSettled: () => void
) {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop =
    targetRect.top - containerRect.top + container.scrollTop;
  const maxScroll = container.scrollHeight - container.clientHeight;
  const destination = Math.max(
    0,
    Math.min(
      maxScroll,
      targetTop - container.clientHeight / 2 + targetRect.height / 2
    )
  );
  const origin = container.scrollTop;
  const distance = destination - origin;
  if (Math.abs(distance) < 1 || durationMs <= 0) {
    container.scrollTop = destination;
    onSettled();
    return () => undefined;
  }

  let frame = 0;
  const startedAt = performance.now();
  function step(now: number) {
    const progress = Math.min(1, (now - startedAt) / durationMs);
    container.scrollTop = origin + distance * easeOutCubic(progress);
    if (progress < 1) {
      frame = window.requestAnimationFrame(step);
      return;
    }
    frame = 0;
    onSettled();
  }
  frame = window.requestAnimationFrame(step);
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
  };
}

const BRIEF_START_MAX_LENGTH = 80;

export function firstLineOf(source: string) {
  const line = source.split("\n").map((text) => text.trim()).find(Boolean) ?? "";
  return line.length > BRIEF_START_MAX_LENGTH
    ? line.slice(0, BRIEF_START_MAX_LENGTH)
    : line;
}

export function agentBriefFor(fileName: string, source: string) {
  const start = firstLineOf(source).replace(/`/g, "'");
  const locate = start
    ? MD_BUILDER_TEXT.agentBriefLocate.replace(MD_BUILDER_TEXT.agentBriefStartPlaceholder, start)
    : "";
  return MD_BUILDER_TEXT.agentBrief
    .replace(MD_BUILDER_TEXT.agentBriefFilePlaceholder, fileName)
    .replace(` ${MD_BUILDER_TEXT.agentBriefLocatePlaceholder}`, locate ? ` ${locate}` : "");
}

const HOST_ORDER = { terminal: 0, unknown: 1, background: 2 } as const;
const MINUTE_MS = 60_000;
const TIME_UNITS = [
  { suffix: "d", ms: 24 * 60 * MINUTE_MS },
  { suffix: "h", ms: 60 * MINUTE_MS },
  { suffix: "m", ms: MINUTE_MS },
] as const;

export function orderSessions<
  T extends { isAgentActive: boolean; hostKind: keyof typeof HOST_ORDER; startedAt: string },
>(sessions: readonly T[]) {
  return [...sessions].sort(
    (first, second) =>
      Number(second.isAgentActive) - Number(first.isAgentActive) ||
      HOST_ORDER[first.hostKind] - HOST_ORDER[second.hostKind] ||
      second.startedAt.localeCompare(first.startedAt)
  );
}

export function timeSince(iso: string, now: number) {
  const elapsed = now - Date.parse(iso);
  if (!Number.isFinite(elapsed) || elapsed < MINUTE_MS) return MD_BUILDER_TEXT.liveJustNow;
  const unit = TIME_UNITS.find((candidate) => elapsed >= candidate.ms) ?? TIME_UNITS[2];
  return `${Math.floor(elapsed / unit.ms)}${unit.suffix} ${MD_BUILDER_TEXT.liveAgo}`;
}

export function sessionHostLabel(hostKind: string, hostApp: string | null) {
  if (hostKind === "background") return MD_BUILDER_TEXT.liveHostBackground;
  if (hostKind === "terminal") {
    return hostApp
      ? `${hostApp.toLowerCase()} ${MD_BUILDER_TEXT.liveHostTerminal}`
      : MD_BUILDER_TEXT.liveHostTerminal;
  }
  return null;
}

export function formatNoteTime(at: string | null) {
  const date = at ? new Date(at) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return {
    short: date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    full: date.toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" }),
  };
}

export function isCommentShortcut(event: KeyboardEvent) {
  return (
    hasModKey(event) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key === COMMENT_SHORTCUT.key
  );
}

export function isSubmitShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}) {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}
