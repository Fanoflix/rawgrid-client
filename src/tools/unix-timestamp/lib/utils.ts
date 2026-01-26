import type { TimestampFormatOption } from "@/tools/unix-timestamp/lib/constants";

export interface TimestampResult {
  gmt: string;
  local: string;
  prettyDate: string;
  prettyTime: string;
  isValid: boolean;
}

function toDate(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return null;
  const isSeconds = trimmed.length <= 10;
  const millis = isSeconds ? numeric * 1000 : numeric;
  const date = new Date(millis);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export interface PrettyDateParts {
  dateLabel: string;
  timeLabel: string;
}

export function formatPrettyDateParts(date: Date): PrettyDateParts {
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { dateLabel, timeLabel };
}

function formatGmt(date: Date, format: TimestampFormatOption["id"]) {
  if (format === "iso") return date.toISOString();
  if (format === "locale") {
    return date.toLocaleString("en-US", { timeZone: "UTC" });
  }
  return date.toUTCString();
}

function formatLocal(date: Date, format: TimestampFormatOption["id"]) {
  if (format === "iso") {
    const offsetMinutes = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offsetMinutes * 60000);
    const iso = localDate.toISOString().replace("Z", "");
    const sign = offsetMinutes <= 0 ? "+" : "-";
    const abs = Math.abs(offsetMinutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, "0");
    const minutes = String(abs % 60).padStart(2, "0");
    return `${iso}${sign}${hours}${minutes}`;
  }
  if (format === "locale") return date.toLocaleString();
  return date.toString();
}

export function formatTimestamp(
  input: string,
  format: TimestampFormatOption["id"]
): TimestampResult {
  const date = toDate(input);
  if (!date) {
    return {
      gmt: "invalid",
      local: "invalid",
      prettyDate: "invalid",
      prettyTime: "",
      isValid: false,
    };
  }
  const pretty = formatPrettyDateParts(date);

  return {
    gmt: formatGmt(date, format),
    local: formatLocal(date, format),
    prettyDate: pretty.dateLabel,
    prettyTime: pretty.timeLabel,
    isValid: true,
  };
}
