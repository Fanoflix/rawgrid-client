import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";

import {
  addToolHistoryEntry,
  getLatestToolHistoryEntry,
  getToolHistoryEntries,
  type ToolHistoryEntry,
} from "@/lib/indexed-history";

export interface UseToolHistoryOptions<T> {
  tool: string;
  initialValue: T;
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
  debounceMs?: number;
  historyLimit?: number;
}

export interface UseToolHistoryResult<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  history: ToolHistoryEntry[];
  isReady: boolean;
}

export function useToolHistory<T>({
  tool,
  initialValue,
  serialize,
  deserialize,
  debounceMs = 400,
  historyLimit = 20,
}: UseToolHistoryOptions<T>): UseToolHistoryResult<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [history, setHistory] = useState<ToolHistoryEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      const latest = await getLatestToolHistoryEntry(tool);
      if (latest?.payload) {
        try {
          const nextValue = deserialize(latest.payload);
          if (isMounted) {
            setValue(nextValue);
            lastSavedRef.current = latest.payload;
          }
        } catch {
          if (isMounted) setValue(initialValue);
        }
      }

      const entries = await getToolHistoryEntries(tool, historyLimit);
      if (isMounted) setHistory(entries);
      if (isMounted) setIsReady(true);
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [tool, initialValue, deserialize, historyLimit]);

  useEffect(() => {
    if (!isReady) return;
    const payload = serialize(value);
    if (payload === lastSavedRef.current) return;

    const handle = window.setTimeout(async () => {
      await addToolHistoryEntry(tool, payload);
      lastSavedRef.current = payload;
      const entries = await getToolHistoryEntries(tool, historyLimit);
      setHistory(entries);
    }, debounceMs);

    return () => window.clearTimeout(handle);
  }, [value, tool, serialize, historyLimit, debounceMs, isReady]);

  return { value, setValue, history, isReady };
}
