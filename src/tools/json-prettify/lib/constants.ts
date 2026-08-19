export interface JsonPrettifyConfig {
  defaultFontSize: number;
  minFontSize: number;
  maxFontSize: number;
}

export const JSON_PRETTIFY_CONFIG: JsonPrettifyConfig = {
  defaultFontSize: 11,
  minFontSize: 7,
  maxFontSize: 18,
};

export type IndentId = "2" | "4" | "tab";

export interface IndentOption {
  id: IndentId;
  label: string;
}

export const INDENT_OPTIONS: IndentOption[] = [
  { id: "2", label: "2 spaces" },
  { id: "4", label: "4 spaces" },
  { id: "tab", label: "tab" },
];

export const DEFAULT_INDENT: IndentId = "2";

/** How long the edited pane sits idle before the other pane is rebuilt. */
export const SYNC_DEBOUNCE_MS = 200;

export const DEFAULT_JSON_INPUT =
  '{"name":"rawgrid","tools":["base64","json prettify"],"nested":{"ok":true,"count":2}}';
