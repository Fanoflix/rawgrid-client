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
