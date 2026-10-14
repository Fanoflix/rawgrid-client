import {
  SOURCE_END_ATTR,
  SOURCE_MAPPED_ATTR,
  SOURCE_START_ATTR,
} from "@/tools/md-builder/lib/render-markdown";

export interface SourceRange {
  start: number;
  end: number;
}

function boundaryOf(
  element: HTMLElement,
  node: Node,
  offset: number,
  isStart: boolean
) {
  const start = Number(element.getAttribute(SOURCE_START_ATTR));
  const end = Number(element.getAttribute(SOURCE_END_ATTR));
  if (node === element) return offset > 0 ? end : start;
  if (node !== element.firstChild) return isStart ? start : end;
  if (element.getAttribute(SOURCE_MAPPED_ATTR) === "1") return start + offset;
  return offset > 0 ? end : start;
}

export function selectedSourceRange(
  container: HTMLElement,
  source: string
): SourceRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const spans = [
    ...container.querySelectorAll<HTMLElement>(`[${SOURCE_START_ATTR}]`),
  ].filter((element) => range.intersectsNode(element));
  if (!spans.length) return null;

  let start = boundaryOf(
    spans[0],
    range.startContainer,
    range.startOffset,
    true
  );
  let end = boundaryOf(
    spans[spans.length - 1],
    range.endContainer,
    range.endOffset,
    false
  );
  if (start > end) return null;

  while (start < end && /\s/.test(source[start])) start++;
  while (end > start && /\s/.test(source[end - 1])) end--;
  return end > start ? { start, end } : null;
}

export function selectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  return selection.getRangeAt(0).getBoundingClientRect();
}

export function clearSelection() {
  window.getSelection()?.removeAllRanges();
}
