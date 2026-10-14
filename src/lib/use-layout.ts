import { useCallback, useEffect, useRef, useState } from "react";

import {
  getDefaultLayoutState,
  loadLayoutState,
  saveLayoutState,
  SLOT_COUNT,
  sortSlots,
  type LayoutState,
  type PanelSizes,
} from "./layout-config";
import type { ToolId } from "./tool-registry";

export function useLayout() {
  const [layoutState, setLayoutState] = useState<LayoutState>(
    getDefaultLayoutState
  );
  const [isReady, setIsReady] = useState(false);
  const [isEditMode, setEditMode] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const hasEditedRef = useRef(false);
  const { toolsBySlot, hiddenSlots, panelSizes, focusedToolId } = layoutState;

  useEffect(() => {
    let isMounted = true;
    loadLayoutState().then((stored) => {
      if (!isMounted) return;
      if (!hasEditedRef.current) setLayoutState(stored);
      setIsReady(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const persistLayoutState = useCallback(
    (update: (current: LayoutState) => LayoutState) => {
      hasEditedRef.current = true;
      setLayoutState((current) => {
        const next = update(current);
        void saveLayoutState(next);
        return next;
      });
    },
    []
  );

  const swapSlots = useCallback(
    (fromSlot: number, toSlot: number) => {
      persistLayoutState((current) => {
        const nextToolsBySlot = [...current.toolsBySlot];
        [nextToolsBySlot[fromSlot], nextToolsBySlot[toSlot]] = [
          nextToolsBySlot[toSlot],
          nextToolsBySlot[fromSlot],
        ];
        return { ...current, toolsBySlot: nextToolsBySlot };
      });
    },
    [persistLayoutState]
  );

  const canHideSlot = hiddenSlots.length < SLOT_COUNT - 1;

  const hideSlot = useCallback(
    (slotIndex: number) => {
      if (!canHideSlot || hiddenSlots.includes(slotIndex)) return;
      persistLayoutState((current) => ({
        ...current,
        hiddenSlots: sortSlots([...current.hiddenSlots, slotIndex]),
        focusedToolId:
          current.toolsBySlot[slotIndex] === current.focusedToolId
            ? null
            : current.focusedToolId,
      }));
    },
    [canHideSlot, hiddenSlots, persistLayoutState]
  );

  const setEditModeExclusive = useCallback(
    (next: boolean) => {
      if (next) {
        persistLayoutState((current) =>
          current.focusedToolId === null
            ? current
            : { ...current, focusedToolId: null }
        );
      }
      setEditMode(next);
    },
    [persistLayoutState]
  );

  const focusTool = useCallback(
    (toolId: ToolId) => {
      setEditMode(false);
      persistLayoutState((current) => {
        if (!current.toolsBySlot.includes(toolId)) return current;
        return { ...current, focusedToolId: toolId };
      });
    },
    [persistLayoutState]
  );

  const exitFocus = useCallback(() => {
    persistLayoutState((current) =>
      current.focusedToolId === null
        ? current
        : { ...current, focusedToolId: null }
    );
  }, [persistLayoutState]);

  const isToolVisible = useCallback(
    (toolId: ToolId) => {
      const slot = toolsBySlot.indexOf(toolId);
      return slot >= 0 && !hiddenSlots.includes(slot);
    },
    [hiddenSlots, toolsBySlot]
  );

  const showSlot = useCallback(
    (slotIndex: number) => {
      persistLayoutState((current) => ({
        ...current,
        hiddenSlots: current.hiddenSlots.filter((slot) => slot !== slotIndex),
      }));
    },
    [persistLayoutState]
  );

  const setPanelSizes = useCallback(
    (sizes: PanelSizes) => {
      persistLayoutState((current) => ({
        ...current,
        panelSizes: { ...current.panelSizes, ...sizes },
      }));
    },
    [persistLayoutState]
  );

  const resetLayout = useCallback(() => {
    persistLayoutState(() => getDefaultLayoutState());
    setLayoutVersion((version) => version + 1);
  }, [persistLayoutState]);

  return {
    toolsBySlot,
    hiddenSlots,
    panelSizes,
    focusedToolId,
    layoutVersion,
    isReady,
    canHideSlot,
    isEditMode,
    setEditMode: setEditModeExclusive,
    swapSlots,
    hideSlot,
    showSlot,
    setPanelSizes,
    focusTool,
    exitFocus,
    isToolVisible,
    resetLayout,
  };
}
