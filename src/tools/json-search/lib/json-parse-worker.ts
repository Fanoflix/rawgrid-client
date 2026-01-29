/// <reference lib="webworker" />

interface ParseWorkerPayload {
  json: string;
}

interface ParseWorkerResult {
  lines: string[];
  error: string | null;
}

const ctx = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<ParseWorkerPayload>) => {
  const rawJson = event.data?.json ?? "";

  if (!rawJson.trim()) {
    const emptyResult: ParseWorkerResult = { lines: [], error: null };
    ctx.postMessage(emptyResult);
    return;
  }

  try {
    const parsed = JSON.parse(rawJson);
    const formatted = JSON.stringify(parsed, null, 2);
    const result: ParseWorkerResult = {
      lines: formatted.split("\n"),
      error: null,
    };
    ctx.postMessage(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid JSON input.";
    const result: ParseWorkerResult = { lines: [], error: message };
    ctx.postMessage(result);
  }
};

export {};
