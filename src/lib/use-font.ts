import { useCallback } from "react";

import { useToolState } from "@/lib/use-tool-state";

export interface UseFontOptions {
  minSize: number;
  maxSize: number;
  defaultSize: number;
  tool?: string;
}

function serializeFontSize(size: number) {
  return String(size);
}

export function useFont({ minSize, maxSize, defaultSize, tool }: UseFontOptions) {
  const deserializeFontSize = useCallback(
    (raw: string) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return defaultSize;
      return Math.min(maxSize, Math.max(minSize, Math.round(parsed)));
    },
    [defaultSize, maxSize, minSize]
  );

  const { value: fontSize, setValue: setFontSize } = useToolState<number>({
    tool: tool ? `${tool}:font-size` : null,
    initialValue: defaultSize,
    serialize: serializeFontSize,
    deserialize: deserializeFontSize,
  });

  function increaseFont() {
    setFontSize((size) => Math.min(size + 1, maxSize));
  }

  function decreaseFont() {
    setFontSize((size) => Math.max(size - 1, minSize));
  }

  return {
    fontSize,
    increaseFont,
    decreaseFont,
  };
}
