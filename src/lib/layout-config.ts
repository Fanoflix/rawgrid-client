import type { ToolId } from "./tool-registry";
import { ALL_TOOL_IDS } from "./tool-registry";
import {
  readAppStateWithLocalStorageFallback,
  writeAppState,
} from "./storage";

export type ToolsBySlot = ToolId[];

export type PanelSizes = Record<string, number>;

export interface LayoutState {
  toolsBySlot: ToolsBySlot;
  hiddenSlots: number[];
  panelSizes: PanelSizes;
  focusedToolId: ToolId | null;
}

const LAYOUT_STATE_KEY = "layout";
const LEGACY_TOOLS_BY_SLOT_STORAGE_KEY = "rawgrid-layout-v2";
const LEGACY_HIDDEN_SLOTS_STORAGE_KEY = "rawgrid-hidden-slots-v1";

export const DEFAULT_TOOLS_BY_SLOT: ToolsBySlot = [
  "unix-timestamp",
  "timer",
  "jwt-decoder",
  "json-prettify",
  "video-player",
  "youtube-player",
  "stacked-textareas",
  "color-picker",
  "json-search",
  "base64",
  "md-builder",
];

export const SLOT_COUNT = DEFAULT_TOOLS_BY_SLOT.length;

export const DEFAULT_HIDDEN_SLOTS: number[] = [4];

export const FOCUS_TABS_HEIGHT = 28;

export function getDefaultLayoutState(): LayoutState {
  return {
    toolsBySlot: [...DEFAULT_TOOLS_BY_SLOT],
    hiddenSlots: [...DEFAULT_HIDDEN_SLOTS],
    panelSizes: {},
    focusedToolId: null,
  };
}

export function isToolId(value: string): value is ToolId {
  return ALL_TOOL_IDS.includes(value as ToolId);
}

export function sortSlots(slots: Iterable<number>) {
  return [...slots].sort((first, second) => first - second);
}

export async function saveLayoutState(layoutState: LayoutState) {
  await writeAppState(LAYOUT_STATE_KEY, layoutState);
}

function parseJson(value: string | null): unknown {
  try {
    return value === null ? null : JSON.parse(value);
  } catch {
    return null;
  }
}

function reconcileToolsBySlot(stored: unknown): {
  toolsBySlot: ToolsBySlot;
  emptySlots: number[];
} | null {
  if (!Array.isArray(stored) || stored.length !== SLOT_COUNT) return null;

  const seenTools = new Set<ToolId>();
  const toolOrNullBySlot = stored.map((entry): ToolId | null => {
    if (!ALL_TOOL_IDS.includes(entry) || seenTools.has(entry)) return null;
    seenTools.add(entry);
    return entry as ToolId;
  });
  const missingTools = ALL_TOOL_IDS.filter((id) => !seenTools.has(id));
  const emptySlots = toolOrNullBySlot.flatMap((tool, slot) =>
    tool ? [] : [slot]
  );
  if (missingTools.length !== emptySlots.length) return null;

  return {
    toolsBySlot: toolOrNullBySlot.map((tool) => tool ?? missingTools.shift()!),
    emptySlots,
  };
}

function reconcileHiddenSlots(stored: unknown, emptySlots: number[]) {
  const hiddenSlots = new Set<number>(emptySlots);
  if (Array.isArray(stored)) {
    for (const slot of stored) {
      if (Number.isInteger(slot) && slot >= 0 && slot < SLOT_COUNT) {
        hiddenSlots.add(slot);
      }
    }
  }
  if (hiddenSlots.size >= SLOT_COUNT) return null;
  return sortSlots(hiddenSlots);
}

function reconcilePanelSizes(stored: unknown): PanelSizes {
  if (!stored || typeof stored !== "object") return {};
  const panelSizes: PanelSizes = {};
  for (const [panelId, size] of Object.entries(stored)) {
    if (typeof size === "number" && Number.isFinite(size) && size > 0) {
      panelSizes[panelId] = size;
    }
  }
  return panelSizes;
}

export function reconcileLayoutState(stored: unknown): LayoutState {
  if (!stored || typeof stored !== "object") return getDefaultLayoutState();
  const candidate = stored as Partial<Record<keyof LayoutState, unknown>>;
  const tools = reconcileToolsBySlot(candidate.toolsBySlot);
  if (!tools) return getDefaultLayoutState();
  const hiddenSlots = reconcileHiddenSlots(
    candidate.hiddenSlots ?? DEFAULT_HIDDEN_SLOTS,
    tools.emptySlots
  );
  if (!hiddenSlots) return getDefaultLayoutState();
  return {
    toolsBySlot: tools.toolsBySlot,
    hiddenSlots,
    panelSizes: reconcilePanelSizes(candidate.panelSizes),
    focusedToolId: reconcileFocusedTool(
      candidate.focusedToolId,
      tools.toolsBySlot,
      hiddenSlots
    ),
  };
}

function reconcileFocusedTool(
  stored: unknown,
  toolsBySlot: ToolsBySlot,
  hiddenSlots: number[]
): ToolId | null {
  if (typeof stored !== "string" || !ALL_TOOL_IDS.includes(stored as ToolId)) {
    return null;
  }
  const slot = toolsBySlot.indexOf(stored as ToolId);
  return slot >= 0 && !hiddenSlots.includes(slot) ? (stored as ToolId) : null;
}

function readLegacyLocalStorageLayout(): LayoutState | undefined {
  try {
    const toolsBySlot = parseJson(
      window.localStorage.getItem(LEGACY_TOOLS_BY_SLOT_STORAGE_KEY)
    );
    if (toolsBySlot === null) return undefined;
    const hiddenSlots = parseJson(
      window.localStorage.getItem(LEGACY_HIDDEN_SLOTS_STORAGE_KEY)
    );
    window.localStorage.removeItem(LEGACY_TOOLS_BY_SLOT_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_HIDDEN_SLOTS_STORAGE_KEY);
    return reconcileLayoutState({ toolsBySlot, hiddenSlots, panelSizes: {} });
  } catch {
    return undefined;
  }
}

export async function loadLayoutState(): Promise<LayoutState> {
  try {
    const stored = await readAppStateWithLocalStorageFallback<LayoutState>(
      LAYOUT_STATE_KEY,
      LEGACY_TOOLS_BY_SLOT_STORAGE_KEY,
      () => readLegacyLocalStorageLayout()
    );
    return reconcileLayoutState(stored);
  } catch {
    return getDefaultLayoutState();
  }
}

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

export function getGridNodeId(node: GridNode) {
  return node.kind === "slot" ? `slot-${node.slot}` : node.id;
}

export function resolveGroupLayout(
  children: SizedGridNode[],
  panelSizes: PanelSizes
): Record<string, number> | undefined {
  const ids = children.map(getGridNodeId);
  if (!ids.every((id) => panelSizes[id] !== undefined)) return undefined;
  const total = ids.reduce((sum, id) => sum + panelSizes[id], 0);
  if (total <= 0) return undefined;
  return Object.fromEntries(ids.map((id) => [id, (panelSizes[id] / total) * 100]));
}

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
        { kind: "slot", slot: 8, size: 22, minSize: 12 },
        { kind: "slot", slot: 9, size: 24, minSize: 12 },
        { kind: "slot", slot: 10, size: 32, minSize: 15 },
      ],
    },
  ],
};
