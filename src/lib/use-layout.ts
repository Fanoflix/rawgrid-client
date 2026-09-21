import { useCallback, useState } from "react";

import {
  getDefaultLayoutState,
  loadLayoutState,
  saveLayoutState,
  SLOT_COUNT,
  sortSlots,
  type LayoutState,
} from "./layout-config";

export function useLayout() {
  const [{ toolsBySlot, hiddenSlots }, setLayoutState] =
    useState<LayoutState>(loadLayoutState);
  const [isEditMode, setEditMode] = useState(false);

  const persistLayoutState = useCallback((nextLayoutState: LayoutState) => {
    setLayoutState(nextLayoutState);
    saveLayoutState(nextLayoutState);
  }, []);

  const swapSlots = useCallback(
    (fromSlot: number, toSlot: number) => {
      const nextToolsBySlot = [...toolsBySlot];
      [nextToolsBySlot[fromSlot], nextToolsBySlot[toSlot]] = [
        nextToolsBySlot[toSlot],
        nextToolsBySlot[fromSlot],
      ];
      persistLayoutState({ toolsBySlot: nextToolsBySlot, hiddenSlots });
    },
    [hiddenSlots, toolsBySlot, persistLayoutState],
  );

  // At least one space always stays, so the grid can't be emptied entirely.
  const canHideSlot = hiddenSlots.length < SLOT_COUNT - 1;

  const hideSlot = useCallback(
    (slotIndex: number) => {
      if (!canHideSlot || hiddenSlots.includes(slotIndex)) return;
      persistLayoutState({
        toolsBySlot,
        hiddenSlots: sortSlots([...hiddenSlots, slotIndex]),
      });
    },
    [canHideSlot, hiddenSlots, toolsBySlot, persistLayoutState],
  );

  const showSlot = useCallback(
    (slotIndex: number) => {
      persistLayoutState({
        toolsBySlot,
        hiddenSlots: hiddenSlots.filter((slot) => slot !== slotIndex),
      });
    },
    [hiddenSlots, toolsBySlot, persistLayoutState],
  );

  const resetLayout = useCallback(() => {
    persistLayoutState(getDefaultLayoutState());
  }, [persistLayoutState]);

  return {
    toolsBySlot,
    hiddenSlots,
    canHideSlot,
    isEditMode,
    setEditMode,
    swapSlots,
    hideSlot,
    showSlot,
    resetLayout,
  };
}
