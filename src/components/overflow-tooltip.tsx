import { createPortal } from "react-dom";

import { useOverflowTooltip } from "@/lib/use-overflow-tooltip";

const VIEWPORT_GUTTER_PX = 8;
const OFFSET_PX = 6;

export function OverflowTooltip() {
  const target = useOverflowTooltip();
  if (!target) return null;

  const left = Math.max(VIEWPORT_GUTTER_PX, target.rect.left);

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 w-max rounded-none border border-border bg-popover/75 px-2 py-1 text-xs text-popover-foreground shadow-lg backdrop-blur-3xl wrap-break-word"
      style={{
        top: target.rect.bottom + OFFSET_PX,
        left,
        maxWidth: `calc(100vw - ${left + VIEWPORT_GUTTER_PX}px)`,
      }}
    >
      {target.text}
    </div>,
    document.body
  );
}
