import { useCallback, useMemo, type ChangeEvent } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import {
  DEFAULT_TEXTAREA_COUNT,
  MAX_TEXTAREA_COUNT,
} from "@/tools/stacked-textareas/lib/constants";

function createDefaultEntries() {
  return Array.from({ length: DEFAULT_TEXTAREA_COUNT }, () => "");
}

function serializeEntries(entries: string[]) {
  return JSON.stringify(entries);
}

function deserializeEntries(raw: string) {
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return createDefaultEntries();
    if (parsed.length === 0) return createDefaultEntries();
    return parsed.map((value) => value ?? "");
  } catch {
    return createDefaultEntries();
  }
}

export function useStackedTextareas() {
  const initialEntries = useMemo(() => createDefaultEntries(), []);
  const { value: entries, setValue: setEntries } = useToolHistory<string[]>({
    tool: "stacked-textareas",
    initialValue: initialEntries,
    serialize: serializeEntries,
    deserialize: deserializeEntries,
  });

  function getEntryChangeHandler(index: number) {
    return function handleEntryChange(event: ChangeEvent<HTMLTextAreaElement>) {
      const nextValue = event.target.value;
      setEntries((previous) =>
        previous.map((value, currentIndex) =>
          currentIndex === index ? nextValue : value
        )
      );
    };
  }

  function setEntryValue(index: number, nextValue: string) {
    setEntries((previous) =>
      previous.map((value, currentIndex) =>
        currentIndex === index ? nextValue : value
      )
    );
  }

  const getEntryRemoveHandler = useCallback(
    (index: number) => {
      return function handleRemove() {
        const target = entries[index] ?? "";
        let confirmed = false;
        if (target.trim()) {
          confirmed = window.confirm("textarea contains text");
        }
        if (confirmed || !target.trim()) {
          setEntries((previous) => {
            if (previous.length <= 1) return previous;
            return previous.filter((_, currentIndex) => currentIndex !== index);
          });
        }
      };
    },
    [entries, setEntries]
  );

  function handleAddEntry() {
    setEntries((previous) => {
      if (previous.length >= MAX_TEXTAREA_COUNT) return previous;
      return [...previous, ""];
    });
  }

  function addNote(text: string) {
    handleAddEntry();
    setEntries((previous) => {
      const next = [...previous];
      next[next.length - 1] = text;
      return next;
    });
  }

  return {
    entries,
    canRemove: entries.length > 1,
    canAdd: entries.length < MAX_TEXTAREA_COUNT,
    getEntryChangeHandler,
    getEntryRemoveHandler,
    setEntryValue,
    handleAddEntry,
    addNote,
  };
}
