import { describe, expect, it } from "vitest";

import {
  DEFAULT_HIDDEN_SLOTS,
  DEFAULT_TOOLS_BY_SLOT,
  getDefaultLayoutState,
  reconcileLayoutState,
  resolveGroupLayout,
  SLOT_COUNT,
  type SizedGridNode,
} from "@/lib/layout-config";

describe("reconcileLayoutState", () => {
  it("falls back to the default for anything that is not an object", () => {
    expect(reconcileLayoutState(null)).toEqual(getDefaultLayoutState());
    expect(reconcileLayoutState("nope")).toEqual(getDefaultLayoutState());
  });

  it("keeps a valid stored layout, including panel sizes", () => {
    const toolsBySlot = [...DEFAULT_TOOLS_BY_SLOT].reverse();
    const stored = {
      toolsBySlot,
      hiddenSlots: [2, 9],
      panelSizes: { "slot-0": 40, top: 55 },
      focusedToolId: toolsBySlot[0],
    };
    expect(reconcileLayoutState(stored)).toEqual(stored);
  });

  it("keeps a focused tool even when its space is hidden, drops unknown ones", () => {
    const hidden = reconcileLayoutState({
      toolsBySlot: DEFAULT_TOOLS_BY_SLOT,
      hiddenSlots: [1],
      focusedToolId: DEFAULT_TOOLS_BY_SLOT[1],
    });
    expect(hidden.focusedToolId).toBe(DEFAULT_TOOLS_BY_SLOT[1]);
    expect(hidden.hiddenSlots).toEqual([1]);
    const unknown = reconcileLayoutState({
      toolsBySlot: DEFAULT_TOOLS_BY_SLOT,
      focusedToolId: "nope",
    });
    expect(unknown.focusedToolId).toBeNull();
  });

  it("keeps an older layout with fewer slots and puts new tools in the new slots", () => {
    const older = [...DEFAULT_TOOLS_BY_SLOT.slice(0, SLOT_COUNT - 1)].reverse();
    const reconciled = reconcileLayoutState({
      toolsBySlot: older,
      hiddenSlots: [2],
      panelSizes: { "slot-0": 30 },
    });
    expect(reconciled.toolsBySlot.slice(0, SLOT_COUNT - 1)).toEqual(older);
    expect(reconciled.toolsBySlot[SLOT_COUNT - 1]).toBe(
      DEFAULT_TOOLS_BY_SLOT[SLOT_COUNT - 1]
    );
    expect(reconciled.hiddenSlots).toEqual([2]);
    expect(reconciled.panelSizes).toEqual({ "slot-0": 30 });
  });

  it("replaces unknown or duplicate tools with the missing ones in place", () => {
    const toolsBySlot = [...DEFAULT_TOOLS_BY_SLOT];
    toolsBySlot[3] = "retired-tool" as never;
    const reconciled = reconcileLayoutState({ toolsBySlot, hiddenSlots: [] });
    expect(reconciled.toolsBySlot[3]).toBe(DEFAULT_TOOLS_BY_SLOT[3]);
    expect(reconciled.hiddenSlots).toEqual([]);
  });

  it("truncates a layout that has more slots than the grid", () => {
    const reconciled = reconcileLayoutState({
      toolsBySlot: [...DEFAULT_TOOLS_BY_SLOT, "extra"],
    });
    expect(reconciled.toolsBySlot).toEqual(DEFAULT_TOOLS_BY_SLOT);
  });

  it("uses the default hidden slots when none are stored", () => {
    const reconciled = reconcileLayoutState({
      toolsBySlot: DEFAULT_TOOLS_BY_SLOT,
    });
    expect(reconciled.hiddenSlots).toEqual(DEFAULT_HIDDEN_SLOTS);
  });

  it("drops invalid panel sizes and bad hidden slots", () => {
    const reconciled = reconcileLayoutState({
      toolsBySlot: DEFAULT_TOOLS_BY_SLOT,
      hiddenSlots: [-1, 99, 1.5, 4],
      panelSizes: { "slot-0": -3, "slot-1": "x", "slot-2": 12 },
    });
    expect(reconciled.hiddenSlots).toEqual([4]);
    expect(reconciled.panelSizes).toEqual({ "slot-2": 12 });
  });

  it("refuses to hide every slot", () => {
    const reconciled = reconcileLayoutState({
      toolsBySlot: DEFAULT_TOOLS_BY_SLOT,
      hiddenSlots: Array.from({ length: SLOT_COUNT }, (_, slot) => slot),
    });
    expect(reconciled).toEqual(getDefaultLayoutState());
  });
});

describe("resolveGroupLayout", () => {
  const children: SizedGridNode[] = [
    { kind: "slot", slot: 0, size: 70, minSize: 20 },
    { kind: "slot", slot: 1, size: 30, minSize: 15 },
  ];

  it("returns nothing when a visible panel has no stored size", () => {
    expect(resolveGroupLayout(children, { "slot-0": 50 })).toBeUndefined();
  });

  it("normalizes stored sizes to add up to 100", () => {
    const layout = resolveGroupLayout(children, {
      "slot-0": 60,
      "slot-1": 20,
      "slot-9": 99,
    });
    expect(layout).toEqual({ "slot-0": 75, "slot-1": 25 });
  });
});
