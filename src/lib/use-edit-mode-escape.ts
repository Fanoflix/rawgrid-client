import { useEffect, useState } from "react";

import { isPageEscape } from "@/lib/utils";

interface UseEditModeEscapeOptions {
  isEditMode: boolean;
  hasEditChanges: boolean;
  setEditMode: (isEditMode: boolean) => void;
  discardEditChanges: () => void;
}

export function useEditModeEscape({
  isEditMode,
  hasEditChanges,
  setEditMode,
  discardEditChanges,
}: UseEditModeEscapeOptions) {
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (!isPageEscape(event)) return;
      if (hasEditChanges) {
        setIsExitConfirmOpen(true);
        return;
      }
      setEditMode(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditMode, hasEditChanges, setEditMode]);

  function keepEditing() {
    setIsExitConfirmOpen(false);
  }

  function keepChanges() {
    setIsExitConfirmOpen(false);
    setEditMode(false);
  }

  function discardChanges() {
    setIsExitConfirmOpen(false);
    discardEditChanges();
  }

  return { isExitConfirmOpen, keepEditing, keepChanges, discardChanges };
}
