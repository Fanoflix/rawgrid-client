export interface TimestampFormatOption {
  id: "date-string" | "iso" | "locale";
  label: string;
}

export interface UnixTimestampState {
  input: string;
  format: TimestampFormatOption["id"];
}

export const TIMESTAMP_FORMAT_OPTIONS: TimestampFormatOption[] = [
  { id: "date-string", label: "date string" },
  { id: "iso", label: "iso" },
  { id: "locale", label: "locale" },
];

export const DEFAULT_UNIX_TIMESTAMP_STATE: UnixTimestampState = {
  input: "",
  format: "date-string",
};
