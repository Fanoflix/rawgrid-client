const AUTHOR_PREFIX_PATTERN = /^([a-z][a-z0-9 _-]{0,15}):\s+/i;

export interface AttributedNote {
  author: string | null;
  text: string;
}

export function splitAuthor(note: string): AttributedNote {
  const match = AUTHOR_PREFIX_PATTERN.exec(note);
  if (!match) return { author: null, text: note };
  return { author: match[1].toLowerCase(), text: note.slice(match[0].length) };
}

export function isAgentComment(notes: string[]) {
  return notes.length > 0 && splitAuthor(notes[0]).author !== null;
}

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

export function isSubmitShortcut(event: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}) {
  return event.key === "Enter" && (event.metaKey || event.ctrlKey);
}
