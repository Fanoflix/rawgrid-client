import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { readToolState, writeToolState } from "@/lib/storage";

export interface UseToolStateOptions<T> {
  tool: string | null;
  initialValue: T;
  serialize: (value: T) => string;
  deserialize: (raw: string) => T;
  debounceMs?: number;
}

export interface UseToolStateResult<T> {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  isReady: boolean;
}

const DEFAULT_DEBOUNCE_MS = 400;

export function useToolState<T>({
  tool,
  initialValue,
  serialize,
  deserialize,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}: UseToolStateOptions<T>): UseToolStateResult<T> {
  const [value, setValueState] = useState<T>(initialValue);
  const [isReady, setIsReady] = useState(tool === null);
  const hasEditedRef = useRef(false);
  const lastSavedRef = useRef<string | null>(null);
  const pendingRef = useRef<string | null>(null);

  const setValue = useCallback<Dispatch<SetStateAction<T>>>((update) => {
    hasEditedRef.current = true;
    setValueState(update);
  }, []);

  useEffect(() => {
    if (tool === null) return;
    let isMounted = true;

    async function hydrate() {
      let stored: string | null = null;
      try {
        stored = await readToolState(tool!);
      } catch {
        stored = null;
      }
      if (!isMounted) return;
      if (stored !== null) {
        lastSavedRef.current = stored;
        if (!hasEditedRef.current) {
          try {
            setValueState(deserialize(stored));
          } catch {
            setValueState(initialValue);
          }
        }
      }
      setIsReady(true);
    }

    hydrate();
    return () => {
      isMounted = false;
    };
  }, [tool, initialValue, deserialize]);

  const flushPending = useCallback(() => {
    const payload = pendingRef.current;
    if (tool === null || payload === null || payload === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = payload;
    pendingRef.current = null;
    writeToolState(tool, payload).catch(() => undefined);
  }, [tool]);

  useEffect(() => {
    if (!isReady || tool === null) return;
    const payload = serialize(value);
    if (payload === lastSavedRef.current) {
      pendingRef.current = null;
      return;
    }
    pendingRef.current = payload;
    const timer = window.setTimeout(flushPending, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, tool, serialize, debounceMs, isReady, flushPending]);

  useEffect(() => flushPending, [flushPending]);

  return { value, setValue, isReady };
}
