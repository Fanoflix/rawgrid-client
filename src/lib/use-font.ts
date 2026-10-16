import { useCallback, useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { FONT_COMMANDS } from "@/lib/tool-hover";
import { useFontScale } from "@/lib/use-font-scale";
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

  const { scale } = useFontScale();
  const { value: baseFontSize, setValue: setFontSize } = useToolState<number>({
    tool: tool ? `${tool}:font-size` : null,
    initialValue: defaultSize,
    serialize: serializeFontSize,
    deserialize: deserializeFontSize,
  });

  const increaseFont = useCallback(() => {
    setFontSize((size) => Math.min(size + 1, maxSize));
  }, [maxSize, setFontSize]);

  const decreaseFont = useCallback(() => {
    setFontSize((size) => Math.max(size - 1, minSize));
  }, [minSize, setFontSize]);

  useEffect(() => {
    if (!tool) return;
    const unsubs = [
      subscribe(FONT_COMMANDS.increase, (toolId) => {
        if (toolId === tool) increaseFont();
      }),
      subscribe(FONT_COMMANDS.decrease, (toolId) => {
        if (toolId === tool) decreaseFont();
      }),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [tool, increaseFont, decreaseFont]);

  return {
    fontSize: baseFontSize * scale,
    increaseFont,
    decreaseFont,
  };
}
