import type { ChangeEvent } from "react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { JSON_SEARCH_DEFAULTS } from "@/tools/json-search/lib/constants";
import {
  getMatchResults,
  parseJsonLines,
  parseQueryConfig,
} from "@/tools/json-search/lib/utils";

export interface JsonSearchState {
  query: string;
  json: string;
}

function isSameValue(left: string, right: string) {
  return left === right;
}

function serializeQuery(value: string) {
  return value;
}

function deserializeQuery(value: string) {
  return value || JSON_SEARCH_DEFAULTS.query;
}

function serializeJson(value: string) {
  return value;
}

function deserializeJson(value: string) {
  return value;
}

export function useJsonSearch() {
  const {
    value: storedQuery,
    setValue: setStoredQuery,
    isReady: isQueryReady,
  } = useToolHistory<string>({
    tool: "json-search-query",
    initialValue: JSON_SEARCH_DEFAULTS.query,
    serialize: serializeQuery,
    deserialize: deserializeQuery,
  });
  const {
    value: storedJson,
    setValue: setStoredJson,
    isReady: isJsonReady,
  } = useToolHistory<string>({
    tool: "json-search-json",
    initialValue: JSON_SEARCH_DEFAULTS.json,
    serialize: serializeJson,
    deserialize: deserializeJson,
  });

  const [query, setQuery] = useState(JSON_SEARCH_DEFAULTS.query);
  const [json, setJson] = useState(JSON_SEARCH_DEFAULTS.json);
  const [hasEditedQuery, setHasEditedQuery] = useState(false);
  const [hasEditedJson, setHasEditedJson] = useState(false);
  const [parsedLines, setParsedLines] = useState<string[]>([]);
  const [parsedError, setParsedError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  function handleQueryChange(event: ChangeEvent<HTMLInputElement>) {
    if (!hasEditedQuery) setHasEditedQuery(true);
    setQuery(event.target.value);
  }

  function handleJsonChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (!hasEditedJson) setHasEditedJson(true);
    setJson(event.target.value);
  }

  useEffect(() => {
    if (!isQueryReady) return;
    if (!hasEditedQuery) return;
    if (isSameValue(query, storedQuery)) return;
    setStoredQuery(query);
  }, [hasEditedQuery, isQueryReady, query, setStoredQuery, storedQuery]);

  useEffect(() => {
    if (!isJsonReady) return;
    if (!hasEditedJson) return;
    if (isSameValue(json, storedJson)) return;
    setStoredJson(json);
  }, [hasEditedJson, isJsonReady, json, setStoredJson, storedJson]);

  function loadJson(value: string) {
    setJson(value);
    setHasEditedJson(true);
  }

  const displayQuery = hasEditedQuery ? query : storedQuery;
  const displayJson = hasEditedJson ? json : storedJson;

  const deferredQuery = useDeferredValue(displayQuery);
  const deferredJson = useDeferredValue(displayJson);

  const config = useMemo(
    () => parseQueryConfig(deferredQuery),
    [deferredQuery]
  );
  const matches = useMemo(
    () => getMatchResults(parsedLines, config),
    [parsedLines, config]
  );

  useEffect(() => {
    const rawJson = deferredJson;
    if (!rawJson.trim()) {
      setParsedLines([]);
      setParsedError(null);
      setIsParsing(false);
      return;
    }

    if (rawJson.length > 250_000) {
      setIsParsing(true);
      setParsedError(null);

      if (workerRef.current) workerRef.current.terminate();
      const worker = new Worker(
        new URL("./json-parse-worker.ts", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      const handleMessage = (
        event: MessageEvent<{
          lines: string[];
          error: string | null;
        }>
      ) => {
        setParsedLines(event.data?.lines ?? []);
        setParsedError(event.data?.error ?? null);
        setIsParsing(false);
      };

      worker.addEventListener("message", handleMessage);
      worker.postMessage({ json: rawJson });

      return () => {
        worker.removeEventListener("message", handleMessage);
        worker.terminate();
      };
    }

    const parsed = parseJsonLines(rawJson);
    setParsedLines(parsed.lines);
    setParsedError(parsed.error);
    setIsParsing(false);
  }, [deferredJson]);

  const state: JsonSearchState = {
    query: displayQuery,
    json: displayJson,
  };

  return {
    state,
    matches,
    config,
    error: parsedError,
    isParsing,
    loadJson,
    handleQueryChange,
    handleJsonChange,
  };
}
