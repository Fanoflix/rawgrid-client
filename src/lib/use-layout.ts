import { useCallback, useMemo, useState } from "react";

import type { ToolId } from "./tool-registry";
import { ALL_TOOL_IDS } from "./tool-registry";
import {
  DEFAULT_LAYOUT,
  loadLayout,
  saveLayout,
  type LayoutConfig,
} from "./layout-config";

export function useLayout() {
  const [layout, setLayout] = useState<LayoutConfig>(loadLayout);
  const [isEditMode, setEditMode] = useState(false);

  const persist = useCallback((next: LayoutConfig) => {
    setLayout(next);
    saveLayout(next);
  }, []);

  const swapSlots = useCallback(
    (from: number, to: number) => {
      const next = [...layout];
      [next[from], next[to]] = [next[to], next[from]];
      persist(next);
    },
    [layout, persist],
  );

  const hideTool = useCallback(
    (slotIndex: number) => {
      const next = [...layout];
      next[slotIndex] = null;
      persist(next);
    },
    [layout, persist],
  );

  const showTool = useCallback(
    (toolId: ToolId) => {
      const next = [...layout];
      const emptySlot = next.indexOf(null);
      if (emptySlot !== -1) {
        next[emptySlot] = toolId;
        persist(next);
      }
    },
    [layout, persist],
  );

  const resetLayout = useCallback(() => {
    persist([...DEFAULT_LAYOUT]);
  }, [persist]);

  const hiddenTools = useMemo(() => {
    const active = new Set(layout.filter(Boolean));
    return ALL_TOOL_IDS.filter((id) => !active.has(id));
  }, [layout]);

  return {
    layout,
    hiddenTools,
    isEditMode,
    setEditMode,
    swapSlots,
    hideTool,
    showTool,
    resetLayout,
  };
}
