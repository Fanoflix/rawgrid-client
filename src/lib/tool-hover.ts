/**
 * Hover is announced on the command bus rather than lifted into `App` state so
 * that moving the cursor across the grid only re-renders the top bar, not all
 * ten tools.
 */
export const HOVER_COMMAND = "tool:hover";

export const FONT_COMMANDS = {
  increase: "font:increase",
  decrease: "font:decrease",
} as const;

export const SAVE_COMMAND = "tool:save";
