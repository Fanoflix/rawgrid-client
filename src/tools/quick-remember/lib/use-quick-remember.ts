import { useMemo, type ChangeEvent } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { QUICK_REMEMBER_COUNT } from "@/tools/quick-remember/lib/constants";

function createDefaultEntries() {
  return Array.from({ length: QUICK_REMEMBER_COUNT }, () => "");
}

function serializeEntries(entries: string[]) {
  return JSON.stringify(entries);
}

function deserializeEntries(raw: string) {
  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultEntries();
    }
    return parsed
      .slice(0, QUICK_REMEMBER_COUNT)
      .concat(
        Array.from(
          { length: Math.max(0, QUICK_REMEMBER_COUNT - parsed.length) },
          () => ""
        )
      )
      .map((value) => value ?? "");
  } catch {
    return createDefaultEntries();
  }
}

export function useQuickRemember() {
  const initialEntries = useMemo(() => createDefaultEntries(), []);
  const { value: entries, setValue: setEntries } = useToolHistory<string[]>({
    tool: "quick-remember",
    initialValue: initialEntries,
    serialize: serializeEntries,
    deserialize: deserializeEntries,
  });

  function getEntryChangeHandler(index: number) {
    return function handleEntryChange(event: ChangeEvent<HTMLInputElement>) {
      const nextValue = event.target.value;
      setEntries((previous) =>
        previous.map((value, currentIndex) =>
          currentIndex === index ? nextValue : value
        )
      );
    };
  }

  return {
    entries,
    getEntryChangeHandler,
  };
}
