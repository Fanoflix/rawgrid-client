interface QueryConfig {
  fields: string[];
  preLines: number;
  postLines: number;
}

interface ParsedJson {
  lines: string[];
  error: string | null;
}

interface MatchResult {
  field: string;
  index: number;
  lines: string[];
}

const LINE_WINDOW_REGEX = /\[(\d+)\s*,\s*(\d+)\]\s*$/;

function escapeRegExp(value: string) {
  // Escape user input so it can be safely used inside a RegExp.
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseQueryConfig(query: string): QueryConfig {
  // Parse "fieldA, fieldB [pre,post]" into fields + line window values.
  const trimmed = query.trim();
  if (!trimmed) return { fields: [], preLines: 0, postLines: 4 };

  const match = trimmed.match(LINE_WINDOW_REGEX);
  const preLines = match ? Number(match[1]) : 0;
  const postLines = match ? Number(match[2]) : 0;
  // Strip the [pre,post] suffix before splitting fields.
  const fieldsPart = match ? trimmed.replace(LINE_WINDOW_REGEX, "") : trimmed;

  const fields = fieldsPart
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);

  return {
    fields,
    preLines: Number.isFinite(preLines) ? preLines : 0,
    postLines: Number.isFinite(postLines) ? postLines : 0,
  };
}

export function parseJsonLines(rawJson: string): ParsedJson {
  // Accept raw JSON and return a pretty-printed, line-based view for searching.
  if (!rawJson.trim()) return { lines: [], error: null };

  try {
    const parsed = JSON.parse(rawJson);
    const formatted = JSON.stringify(parsed, null, 2);
    return { lines: formatted.split("\n"), error: null };
  } catch (error) {
    if (error instanceof Error) {
      return { lines: [], error: error.message };
    }
    return { lines: [], error: "Invalid JSON input." };
  }
}

export function getMatchResults(
  lines: string[],
  config: QueryConfig
): MatchResult[] {
  // Find each field key and return a slice of lines around every match.
  if (!lines.length || !config.fields.length) return [];

  return config.fields.flatMap((field) => {
    // Match the exact JSON key (with optional whitespace) followed by a colon.
    const regex = new RegExp(`"\\s*${escapeRegExp(field)}\\s*"\\s*:`);
    const matches = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => regex.test(line));

    return matches.map(({ index }) => {
      // Clamp the window to the available line range.
      const start = Math.max(0, index - config.preLines);
      const end = Math.min(lines.length - 1, index + config.postLines);
      return {
        field,
        index,
        lines: lines.slice(start, end + 1),
      };
    });
  });
}
