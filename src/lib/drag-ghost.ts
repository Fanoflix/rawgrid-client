import type { Active, ClientRect, Modifier, Over } from "@dnd-kit/core";

// The drag ghost is the dashed box that follows the cursor while a space is
// dragged. Away from any other space it's a clamped copy of the dragged space;
// over another space it snaps onto that space to preview the tool's new size.

const MAX_GHOST_WIDTH = 420;
const MAX_GHOST_HEIGHT = 300;
/** Where the cursor sits inside a free-floating ghost: on its header. */
const GRAB_OFFSET_Y = 16;

interface GhostSize {
  width: number;
  height: number;
}

/** The space the ghost would land in, or null when it's over nothing or itself. */
export function getDropTarget(active: Active | null, over: Over | null) {
  if (!active || !over) return null;
  if (over.data.current?.slotIndex === active.data.current?.slotIndex) {
    return null;
  }
  return over;
}

export function getGhostSize(
  activeRect: ClientRect,
  dropTarget: Over | null,
): GhostSize {
  if (dropTarget) {
    return { width: dropTarget.rect.width, height: dropTarget.rect.height };
  }
  return {
    width: Math.min(activeRect.width, MAX_GHOST_WIDTH),
    height: Math.min(activeRect.height, MAX_GHOST_HEIGHT),
  };
}

// The DragOverlay wrapper starts at the dragged space's position, so these
// transforms are offsets from there.
export const ghostModifier: Modifier = ({
  transform,
  active,
  over,
  activeNodeRect,
  activatorEvent,
}) => {
  if (!activeNodeRect) return transform;

  const dropTarget = getDropTarget(active, over);
  if (dropTarget) {
    return {
      ...transform,
      x: dropTarget.rect.left - activeNodeRect.left,
      y: dropTarget.rect.top - activeNodeRect.top,
    };
  }

  if (!(activatorEvent instanceof PointerEvent)) return transform;

  const { width } = getGhostSize(activeNodeRect, null);
  return {
    ...transform,
    x: activatorEvent.clientX + transform.x - width / 2 - activeNodeRect.left,
    y: activatorEvent.clientY + transform.y - GRAB_OFFSET_Y - activeNodeRect.top,
  };
};
