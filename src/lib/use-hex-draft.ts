import { useState, type ChangeEvent } from "react";

import { normalizeHexColor } from "@/lib/custom-theme";

const FULL_HEX_PATTERN = /^#?[0-9a-f]{6}$/i;

export function useHexDraft(hex: string, onCommit: (hex: string) => void) {
  const [draft, setDraft] = useState(hex);
  const [syncedHex, setSyncedHex] = useState(hex);

  if (hex !== syncedHex) {
    setSyncedHex(hex);
    if (normalizeHexColor(draft) !== hex) setDraft(hex);
  }

  const isValid = normalizeHexColor(draft) !== null;

  function commit(value: string) {
    const normalized = normalizeHexColor(value);
    if (normalized && normalized !== hex) onCommit(normalized);
  }

  function handleDraftChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setDraft(value);
    if (FULL_HEX_PATTERN.test(value.trim())) commit(value);
  }

  function handleDraftBlur() {
    if (isValid) {
      commit(draft);
      setDraft(normalizeHexColor(draft) ?? hex);
      return;
    }
    setDraft(hex);
  }

  return { draft, isValid, handleDraftChange, handleDraftBlur };
}
