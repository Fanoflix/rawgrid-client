import type { ToolId } from "./tool-registry";
import { ALL_TOOL_IDS } from "./tool-registry";

/** Which tool sits in each space. Every tool always has exactly one space. */
export type ToolsBySlot = ToolId[];

export interface LayoutState {
  toolsBySlot: ToolsBySlot;
  /** Spaces removed from the grid; their tools come back with them. */
  hiddenSlots: number[];
}

const TOOLS_BY_SLOT_STORAGE_KEY = "rawgrid-layout-v2";
const HIDDEN_SLOTS_STORAGE_KEY = "rawgrid-hidden-slots-v1";

export const DEFAULT_TOOLS_BY_SLOT: ToolsBySlot = [
  "unix-timestamp", // Slot 0: top-left-upper
  "timer", // Slot 1: top-left-lower
  "jwt-decoder", // Slot 2: top-center-left
  "json-prettify", // Slot 3: top-center-right-upper
  "video-player", // Slot 4: top-center-right-lower (hidden by default)
  "youtube-player", // Slot 5: top-right
  "stacked-textareas", // Slot 6: bottom-left-upper
  "color-picker", // Slot 7: bottom-left-lower
  "json-search", // Slot 8: bottom-center
  "base64", // Slot 9: bottom-right
];

export const SLOT_COUNT = DEFAULT_TOOLS_BY_SLOT.length;

export const DEFAULT_HIDDEN_SLOTS: number[] = [4];

export function getDefaultLayoutState(): LayoutState {
  return {
    toolsBySlot: [...DEFAULT_TOOLS_BY_SLOT],
    hiddenSlots: [...DEFAULT_HIDDEN_SLOTS],
  };
}

export function sortSlots(slots: Iterable<number>) {
  return [...slots].sort((first, second) => first - second);
}

export function saveLayoutState({ toolsBySlot, hiddenSlots }: LayoutState): void {
  localStorage.setItem(TOOLS_BY_SLOT_STORAGE_KEY, JSON.stringify(toolsBySlot));
  localStorage.setItem(HIDDEN_SLOTS_STORAGE_KEY, JSON.stringify(hiddenSlots));
}

// Layouts saved before every space had to hold a tool can contain nulls
// (removed tools). Those spaces get the missing tools back and start hidden,
// so nothing the user had removed reappears unasked.
export function loadLayoutState(): LayoutState {
  try {
    const storedToolsBySlot = parseJson(
      localStorage.getItem(TOOLS_BY_SLOT_STORAGE_KEY)
    );
    if (
      !Array.isArray(storedToolsBySlot) ||
      storedToolsBySlot.length !== SLOT_COUNT
    ) {
      return getDefaultLayoutState();
    }

    const seenTools = new Set<ToolId>();
    const toolOrNullBySlot = storedToolsBySlot.map((entry): ToolId | null => {
      if (!ALL_TOOL_IDS.includes(entry) || seenTools.has(entry)) return null;
      seenTools.add(entry);
      return entry as ToolId;
    });
    const missingTools = ALL_TOOL_IDS.filter((id) => !seenTools.has(id));
    const emptySlots = toolOrNullBySlot.flatMap((tool, slot) =>
      tool ? [] : [slot]
    );
    const hasToolRegistryChanged = missingTools.length !== emptySlots.length;
    if (hasToolRegistryChanged) return getDefaultLayoutState();

    const toolsBySlot = toolOrNullBySlot.map(
      (tool) => tool ?? missingTools.shift()!
    );

    const storedHiddenSlots = parseJson(
      localStorage.getItem(HIDDEN_SLOTS_STORAGE_KEY)
    );
    const hiddenSlots = new Set<number>(emptySlots);
    if (Array.isArray(storedHiddenSlots)) {
      for (const slot of storedHiddenSlots) {
        if (Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT) {
          hiddenSlots.add(slot);
        }
      }
    }
    // At least one space has to stay on screen.
    if (hiddenSlots.size >= SLOT_COUNT) return getDefaultLayoutState();

    return { toolsBySlot, hiddenSlots: sortSlots(hiddenSlots) };
  } catch {
    return getDefaultLayoutState();
  }
}

function parseJson(value: string | null): unknown {
  return value === null ? null : JSON.parse(value);
}

// The grid as a tree of resizable groups. Sizes are percentages of the parent
// group; when spaces are hidden, the visible siblings' sizes are rescaled so
// they fill the freed room.
export interface GridSlotNode {
  kind: "slot";
  slot: number;
}

export interface GridGroupNode {
  kind: "group";
  id: string;
  direction: "horizontal" | "vertical";
  children: SizedGridNode[];
}

export type GridNode = GridSlotNode | GridGroupNode;

export type SizedGridNode = GridNode & { size: number; minSize: number };

export const GRID_TREE: GridGroupNode = {
  kind: "group",
  id: "root",
  direction: "vertical",
  children: [
    {
      kind: "group",
      id: "top",
      direction: "horizontal",
      size: 40,
      minSize: 15,
      children: [
        {
          kind: "group",
          id: "top-left",
          direction: "vertical",
          size: 12,
          minSize: 8,
          children: [
            { kind: "slot", slot: 0, size: 70, minSize: 20 },
            { kind: "slot", slot: 1, size: 30, minSize: 15 },
          ],
        },
        { kind: "slot", slot: 2, size: 23, minSize: 10 },
        {
          kind: "group",
          id: "top-center-right",
          direction: "vertical",
          size: 45,
          minSize: 15,
          children: [
            { kind: "slot", slot: 3, size: 45, minSize: 15 },
            { kind: "slot", slot: 4, size: 55, minSize: 10 },
          ],
        },
        { kind: "slot", slot: 5, size: 20, minSize: 10 },
      ],
    },
    {
      kind: "group",
      id: "bottom",
      direction: "horizontal",
      size: 60,
      minSize: 15,
      children: [
        {
          kind: "group",
          id: "bottom-left",
          direction: "vertical",
          size: 22,
          minSize: 12,
          children: [
            { kind: "slot", slot: 6, size: 68, minSize: 20 },
            { kind: "slot", slot: 7, size: 32, minSize: 12 },
          ],
        },
        { kind: "slot", slot: 8, size: 24, minSize: 12 },
        { kind: "slot", slot: 9, size: 54, minSize: 15 },
      ],
    },
  ],
};
