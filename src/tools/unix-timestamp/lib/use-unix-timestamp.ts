import type { ChangeEvent } from "react";
import { useMemo } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import {
  DEFAULT_UNIX_TIMESTAMP_STATE,
  TIMESTAMP_FORMAT_OPTIONS,
  type TimestampFormatOption,
  type UnixTimestampState,
} from "@/tools/unix-timestamp/lib/constants";
import { formatTimestamp } from "@/tools/unix-timestamp/lib/utils";

export interface UnixTimestampOutput {
  gmt: string;
  local: string;
  prettyDate: string;
  prettyTime: string;
  prettyDisplay: string;
}

function serializeTimestampState(state: UnixTimestampState) {
  return JSON.stringify(state);
}

function deserializeTimestampState(raw: string) {
  try {
    const parsed = JSON.parse(raw) as UnixTimestampState;
    if (!parsed?.format) return DEFAULT_UNIX_TIMESTAMP_STATE;
    return parsed;
  } catch {
    return DEFAULT_UNIX_TIMESTAMP_STATE;
  }
}

export function useUnixTimestamp() {
  const { value: state, setValue: setState } =
    useToolHistory<UnixTimestampState>({
      tool: "unix-timestamp",
      initialValue: DEFAULT_UNIX_TIMESTAMP_STATE,
      serialize: serializeTimestampState,
      deserialize: deserializeTimestampState,
    });

  const output = useMemo<UnixTimestampOutput>(() => {
    const result = formatTimestamp(state.input, state.format);
    const prettyDisplay = result.isValid
      ? `${result.prettyDate} | ${result.prettyTime}`
      : result.prettyDate;
    return {
      gmt: result.gmt,
      local: result.local,
      prettyDate: result.prettyDate,
      prettyTime: result.prettyTime,
      prettyDisplay,
    };
  }, [state]);

  function setTimestampInput(value: string) {
    setState((previous) => ({ ...previous, input: value }));
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setState((previous) => ({
      ...previous,
      input: event.target.value,
    }));
  }

  function handleFormatChange(nextFormat: TimestampFormatOption["id"]) {
    setState((previous) => ({
      ...previous,
      format: nextFormat,
    }));
  }

  return {
    state,
    output,
    formatOptions: TIMESTAMP_FORMAT_OPTIONS,
    setTimestampInput,
    handleInputChange,
    handleFormatChange,
  };
}
