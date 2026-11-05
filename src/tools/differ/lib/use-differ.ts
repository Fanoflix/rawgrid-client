import { useCallback, useMemo, useRef, useState } from "react";

import { useFont } from "@/lib/use-font";
import { useToolState } from "@/lib/use-tool-state";
import type {
  ChangeDirection,
  DiffSide,
  DifferSettings,
} from "@/tools/differ/lib/constants";
import {
  DEFAULT_DIFFER_SETTINGS,
  DIFFER_CONFIG,
  DIFFER_COPY,
} from "@/tools/differ/lib/constants";
import type { DiffSummary } from "@/tools/differ/lib/utils";
import {
  deserializeDifferSettings,
  EMPTY_DIFF_SUMMARY,
  formatJsonSide,
  isBinaryText,
  serializeDifferSettings,
} from "@/tools/differ/lib/utils";

export type SideErrors = Record<DiffSide, string | null>;

export interface MergeEditorHandle {
  goToChange: (direction: ChangeDirection) => void;
}

export interface DifferState extends DifferSettings {
  errors: SideErrors;
  summary: DiffSummary;
  fontSize: number;
}

const NO_ERRORS: SideErrors = { original: null, changed: null };

export function useDiffer() {
  const initialValue = useMemo(() => ({ ...DEFAULT_DIFFER_SETTINGS }), []);
  const { value: settings, setValue: setSettings } =
    useToolState<DifferSettings>({
      tool: "differ",
      initialValue,
      serialize: serializeDifferSettings,
      deserialize: deserializeDifferSettings,
    });

  const [errors, setErrors] = useState<SideErrors>(NO_ERRORS);
  const [summary, setSummary] = useState<DiffSummary>(EMPTY_DIFF_SUMMARY);
  const editorRef = useRef<MergeEditorHandle>(null);

  const { fontSize, increaseFont, decreaseFont } = useFont({
    tool: "differ",
    defaultSize: DIFFER_CONFIG.defaultFontSize,
    minSize: DIFFER_CONFIG.minFontSize,
    maxSize: DIFFER_CONFIG.maxFontSize,
  });

  const setSideError = useCallback((side: DiffSide, error: string | null) => {
    setErrors((previous) =>
      previous[side] === error ? previous : { ...previous, [side]: error }
    );
  }, []);

  const placeText = useCallback(
    (side: DiffSide, text: string, shouldFormatJson: boolean) => {
      const formatted = shouldFormatJson
        ? formatJsonSide(text)
        : { text, error: null };
      setSettings((previous) => ({ ...previous, [side]: formatted.text }));
      setSideError(side, formatted.error);
    },
    [setSettings, setSideError]
  );

  const handleSideChange = useCallback(
    (side: DiffSide, text: string, isPaste: boolean) => {
      placeText(side, text, isPaste && settings.isJsonMode);
    },
    [placeText, settings.isJsonMode]
  );

  const setSide = useCallback(
    (side: DiffSide, text: string) => {
      placeText(side, text, settings.isJsonMode);
    },
    [placeText, settings.isJsonMode]
  );

  const loadFile = useCallback(
    async (side: DiffSide, file: File) => {
      if (file.size > DIFFER_CONFIG.maxFileBytes) {
        setSideError(side, DIFFER_COPY.fileTooLarge);
        return;
      }
      try {
        const text = await file.text();
        if (isBinaryText(text)) {
          setSideError(side, DIFFER_COPY.fileNotText);
          return;
        }
        placeText(side, text, settings.isJsonMode);
      } catch {
        setSideError(side, DIFFER_COPY.fileUnreadable);
      }
    },
    [placeText, setSideError, settings.isJsonMode]
  );

  const toggleJsonMode = useCallback(() => {
    if (settings.isJsonMode) {
      setSettings((previous) => ({ ...previous, isJsonMode: false }));
      setErrors(NO_ERRORS);
      return;
    }
    const original = formatJsonSide(settings.original);
    const changed = formatJsonSide(settings.changed);
    setSettings((previous) => ({
      ...previous,
      isJsonMode: true,
      original: original.text,
      changed: changed.text,
    }));
    setErrors({ original: original.error, changed: changed.error });
  }, [settings.changed, settings.isJsonMode, settings.original, setSettings]);

  const toggleIgnoreWhitespace = useCallback(() => {
    setSettings((previous) => ({
      ...previous,
      isIgnoringWhitespace: !previous.isIgnoringWhitespace,
    }));
  }, [setSettings]);

  const toggleCollapseUnchanged = useCallback(() => {
    setSettings((previous) => ({
      ...previous,
      isCollapsingUnchanged: !previous.isCollapsingUnchanged,
    }));
  }, [setSettings]);

  const swapSides = useCallback(() => {
    setSettings((previous) => ({
      ...previous,
      original: previous.changed,
      changed: previous.original,
    }));
    setErrors((previous) => ({
      original: previous.changed,
      changed: previous.original,
    }));
  }, [setSettings]);

  const clearSide = useCallback(
    (side: DiffSide) => {
      setSettings((previous) => ({ ...previous, [side]: "" }));
      setSideError(side, null);
    },
    [setSettings, setSideError]
  );

  const clearBoth = useCallback(() => {
    setSettings((previous) => ({ ...previous, original: "", changed: "" }));
    setErrors(NO_ERRORS);
  }, [setSettings]);

  const goToChange = useCallback((direction: ChangeDirection) => {
    editorRef.current?.goToChange(direction);
  }, []);

  const state: DifferState = {
    ...settings,
    errors,
    summary,
    fontSize,
  };

  return {
    state,
    editorRef,
    handleSideChange,
    handleSummaryChange: setSummary,
    setSide,
    loadFile,
    toggleJsonMode,
    toggleIgnoreWhitespace,
    toggleCollapseUnchanged,
    swapSides,
    clearSide,
    clearBoth,
    goToChange,
    increaseFont,
    decreaseFont,
  };
}
