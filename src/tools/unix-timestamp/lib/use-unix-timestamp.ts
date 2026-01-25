import type { ChangeEvent } from "react"
import { useMemo } from "react"

import { useToolHistory } from "@/lib/use-tool-history"
import {
  DEFAULT_UNIX_TIMESTAMP_STATE,
  TIMESTAMP_FORMAT_OPTIONS,
  type TimestampFormatOption,
  type UnixTimestampState,
} from "@/tools/unix-timestamp/lib/constants"
import { formatTimestamp } from "@/tools/unix-timestamp/lib/utils"

export interface UnixTimestampOutput {
  gmt: string
  local: string
}

function serializeTimestampState(state: UnixTimestampState) {
  return JSON.stringify(state)
}

function deserializeTimestampState(raw: string) {
  try {
    const parsed = JSON.parse(raw) as UnixTimestampState
    if (!parsed?.format) return DEFAULT_UNIX_TIMESTAMP_STATE
    return parsed
  } catch {
    return DEFAULT_UNIX_TIMESTAMP_STATE
  }
}

export function useUnixTimestamp() {
  const { value: state, setValue: setState } =
    useToolHistory<UnixTimestampState>({
      tool: "unix-timestamp",
      initialValue: DEFAULT_UNIX_TIMESTAMP_STATE,
      serialize: serializeTimestampState,
      deserialize: deserializeTimestampState,
    })

  const output = useMemo<UnixTimestampOutput>(() => {
    const result = formatTimestamp(state.input, state.format)
    return { gmt: result.gmt, local: result.local }
  }, [state])

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setState((previous) => ({
      ...previous,
      input: event.target.value,
    }))
  }

  function handleFormatChange(nextFormat: TimestampFormatOption["id"]) {
    setState((previous) => ({
      ...previous,
      format: nextFormat,
    }))
  }

  return {
    state,
    output,
    formatOptions: TIMESTAMP_FORMAT_OPTIONS,
    handleInputChange,
    handleFormatChange,
  }
}
