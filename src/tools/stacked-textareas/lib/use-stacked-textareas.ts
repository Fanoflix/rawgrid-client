import type { ChangeEvent } from "react"

import { useToolHistory } from "@/lib/use-tool-history"
import { DEFAULT_TEXTAREA_COUNT } from "@/tools/stacked-textareas/lib/constants"

function createDefaultEntries() {
  return Array.from({ length: DEFAULT_TEXTAREA_COUNT }, () => "")
}

function serializeEntries(entries: string[]) {
  return JSON.stringify(entries)
}

function deserializeEntries(raw: string) {
  try {
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return createDefaultEntries()
    if (parsed.length === 0) return createDefaultEntries()
    return parsed.map((value) => value ?? "")
  } catch {
    return createDefaultEntries()
  }
}

export function useStackedTextareas() {
  const { value: entries, setValue: setEntries } = useToolHistory<string[]>({
    tool: "stacked-textareas",
    initialValue: createDefaultEntries(),
    serialize: serializeEntries,
    deserialize: deserializeEntries,
  })

  function getEntryChangeHandler(index: number) {
    return function handleEntryChange(event: ChangeEvent<HTMLTextAreaElement>) {
      const nextValue = event.target.value
      setEntries((previous) =>
        previous.map((value, currentIndex) =>
          currentIndex === index ? nextValue : value
        )
      )
    }
  }

  function getEntryRemoveHandler(index: number) {
    return function handleRemove() {
      setEntries((previous) => {
        if (previous.length <= 1) return previous
        const target = previous[index] ?? ""
        if (target.trim()) {
          window.alert("textarea contains text")
        }
        return previous.filter((_, currentIndex) => currentIndex !== index)
      })
    }
  }

  return {
    entries,
    canRemove: entries.length > 1,
    getEntryChangeHandler,
    getEntryRemoveHandler,
  }
}
