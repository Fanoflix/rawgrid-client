/**
 * Hover is announced on the command bus rather than lifted into `App` state so
 * that moving the cursor across the grid only re-renders the top bar, not all
 * ten tools.
 */
export const HOVER_COMMAND = "tool:hover";

/** Payload used by slots that hold no tool. */
export const EMPTY_SLOT = "__empty__";

export const EMPTY_SLOT_HINT = "empty area, add a tool";
