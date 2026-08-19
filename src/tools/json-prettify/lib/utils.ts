import type { IndentId } from "@/tools/json-prettify/lib/constants"

export interface JsonFormatResult {
  value: string
  error: string | null
}

export interface JsonStats {
  lines: number
  characters: number
  bytes: number
}

const POSITION_REGEX = /position (\d+)/
const LINE_COLUMN_REGEX = /line \d+ column \d+/i

function indentToken(indent: IndentId) {
  if (indent === "tab") return "\t"
  return Number(indent)
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>
    return Object.keys(source)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue(source[key])
        return accumulator
      }, {})
  }

  return value
}

/**
 * Some engines only report a character offset, which is useless against a
 * pasted blob. Translate it into a line/column the user can actually find,
 * unless the engine already spelled one out.
 */
function describeParseError(error: unknown, raw: string) {
  const message = error instanceof Error ? error.message : "invalid json"
  if (LINE_COLUMN_REGEX.test(message)) return message

  const match = message.match(POSITION_REGEX)
  if (!match) return message

  const position = Math.min(Number(match[1]), raw.length)
  const before = raw.slice(0, position)
  const line = before.split("\n").length
  const column = position - before.lastIndexOf("\n")

  return `${message} (line ${line}, column ${column})`
}

function transform(
  raw: string,
  sortKeys: boolean,
  toText: (parsed: unknown) => string
): JsonFormatResult {
  if (!raw.trim()) return { value: "", error: null }

  try {
    const parsed = JSON.parse(raw) as unknown
    return { value: toText(sortKeys ? sortValue(parsed) : parsed), error: null }
  } catch (error) {
    return { value: "", error: describeParseError(error, raw) }
  }
}

export function prettifyJson(
  raw: string,
  indent: IndentId,
  sortKeys = false
): JsonFormatResult {
  return transform(raw, sortKeys, (parsed) =>
    JSON.stringify(parsed, null, indentToken(indent))
  )
}

export function minifyJson(raw: string, sortKeys = false): JsonFormatResult {
  return transform(raw, sortKeys, (parsed) => JSON.stringify(parsed))
}

export function getJsonStats(value: string): JsonStats {
  if (!value) return { lines: 0, characters: 0, bytes: 0 }

  return {
    lines: value.split("\n").length,
    characters: value.length,
    bytes: new TextEncoder().encode(value).length,
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} b`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`
  return `${(bytes / (1024 * 1024)).toFixed(1)} mb`
}
