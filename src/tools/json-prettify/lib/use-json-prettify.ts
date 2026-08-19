import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { useFont } from "@/lib/use-font";
import { useToolHistory } from "@/lib/use-tool-history";
import type { IndentId } from "@/tools/json-prettify/lib/constants";
import {
  DEFAULT_INDENT,
  DEFAULT_JSON_INPUT,
  INDENT_OPTIONS,
  JSON_PRETTIFY_CONFIG,
  SYNC_DEBOUNCE_MS,
} from "@/tools/json-prettify/lib/constants";
import type { JsonStats } from "@/tools/json-prettify/lib/utils";
import {
  getJsonStats,
  minifyJson,
  prettifyJson,
} from "@/tools/json-prettify/lib/utils";

export type JsonOutputMode = "pretty" | "minified";

/** Which pane the user typed in last; the other one is rebuilt from it. */
export type JsonPane = "input" | "output";

export interface JsonPrettifySettings {
  input: string;
  output: string;
  indent: IndentId;
  sortKeys: boolean;
  mode: JsonOutputMode;
}

export interface JsonPrettifyState extends JsonPrettifySettings {
  source: JsonPane;
  inputError: string | null;
  outputError: string | null;
  isPending: boolean;
  stats: JsonStats;
  fontSize: number;
}

const DEFAULT_SETTINGS: JsonPrettifySettings = {
  input: DEFAULT_JSON_INPUT,
  output: "",
  indent: DEFAULT_INDENT,
  sortKeys: false,
  mode: "pretty",
};

function serializeSettings(settings: JsonPrettifySettings) {
  return JSON.stringify(settings);
}

function deserializeSettings(raw: string): JsonPrettifySettings {
  try {
    const parsed = JSON.parse(raw) as Partial<JsonPrettifySettings>;
    const indent = parsed?.indent;
    return {
      input: parsed?.input ?? "",
      output: parsed?.output ?? "",
      indent: INDENT_OPTIONS.some((option) => option.id === indent)
        ? (indent as IndentId)
        : DEFAULT_INDENT,
      sortKeys: Boolean(parsed?.sortKeys),
      mode: parsed?.mode === "minified" ? "minified" : "pretty",
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useJsonPrettify() {
  const initialValue = useMemo(() => ({ ...DEFAULT_SETTINGS }), []);
  const { value: settings, setValue: setSettings } =
    useToolHistory<JsonPrettifySettings>({
      tool: "json-prettify",
      initialValue,
      serialize: serializeSettings,
      deserialize: deserializeSettings,
    });

  const [source, setSource] = useState<JsonPane>("input");
  const [inputError, setInputError] = useState<string | null>(null);
  const [outputError, setOutputError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { fontSize, increaseFont, decreaseFont } = useFont({
    defaultSize: JSON_PRETTIFY_CONFIG.defaultFontSize,
    minSize: JSON_PRETTIFY_CONFIG.minFontSize,
    maxSize: JSON_PRETTIFY_CONFIG.maxFontSize,
  });

  const { indent, sortKeys, mode } = settings;
  const sourceText = source === "input" ? settings.input : settings.output;

  // The edited pane rebuilds the other one, but only once typing settles.
  // Writing the target pane never re-triggers this, so the two cannot loop.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const target = source === "input" ? "output" : "input";

      if (!sourceText.trim()) {
        setInputError(null);
        setOutputError(null);
        setSettings((previous) => ({ ...previous, [target]: "" }));
        setIsPending(false);
        return;
      }

      // The output pane shows the chosen mode; the input pane holds the
      // counterpart form, so editing either side still reads naturally.
      const result =
        target === "output"
          ? mode === "minified"
            ? minifyJson(sourceText, sortKeys)
            : prettifyJson(sourceText, indent, sortKeys)
          : mode === "minified"
            ? prettifyJson(sourceText, indent, sortKeys)
            : minifyJson(sourceText, sortKeys);

      const setSourceError =
        source === "input" ? setInputError : setOutputError;
      const setTargetError =
        source === "input" ? setOutputError : setInputError;

      setSourceError(result.error);
      setIsPending(false);

      if (result.error) return;

      setTargetError(null);
      setSettings((previous) => ({ ...previous, [target]: result.value }));
    }, SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [sourceText, source, indent, sortKeys, mode, setSettings]);

  function editPane(pane: JsonPane, nextText: string) {
    setSource(pane);
    setIsPending(true);
    setSettings((previous) => ({ ...previous, [pane]: nextText }));
  }

  function setInput(nextInput: string) {
    editPane("input", nextInput);
  }

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    editPane("input", event.target.value);
  }

  function handleOutputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    editPane("output", event.target.value);
  }

  // The toggles below describe the output pane, so rebuilding always runs
  // input -> output regardless of which pane was edited last.
  function handleIndentChange(nextIndent: IndentId) {
    setSource("input");
    setIsPending(true);
    setSettings((previous) => ({
      ...previous,
      indent: nextIndent,
      mode: "pretty",
    }));
  }

  function setMode(nextMode: JsonOutputMode) {
    setSource("input");
    setIsPending(true);
    setSettings((previous) => ({ ...previous, mode: nextMode }));
  }

  function toggleSortKeys() {
    setSource("input");
    setIsPending(true);
    setSettings((previous) => ({ ...previous, sortKeys: !previous.sortKeys }));
  }

  function clearPane(pane: JsonPane) {
    editPane(pane, "");
  }

  const stats = useMemo(
    () => getJsonStats(settings.output),
    [settings.output]
  );

  const state: JsonPrettifyState = {
    ...settings,
    source,
    inputError,
    outputError,
    isPending,
    stats,
    fontSize,
  };

  return {
    state,
    indentOptions: INDENT_OPTIONS,
    setInput,
    handleInputChange,
    handleOutputChange,
    handleIndentChange,
    setMode,
    toggleSortKeys,
    clearPane,
    increaseFont,
    decreaseFont,
  };
}
