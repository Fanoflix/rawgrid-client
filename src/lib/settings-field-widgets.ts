import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

import { findSettingsFields, type SettingsFieldRange } from "@/lib/settings-json";

export interface SettingsFieldOpenRequest {
  range: SettingsFieldRange;
  anchorRect: DOMRect;
}

const FIELD_WIDGET_TEXT = {
  pickColor: "pick a color for",
  pickFont: "pick a font for",
} as const;

class SettingsFieldWidget extends WidgetType {
  readonly range: SettingsFieldRange;
  readonly onOpen: (request: SettingsFieldOpenRequest) => void;

  constructor(range: SettingsFieldRange, onOpen: (request: SettingsFieldOpenRequest) => void) {
    super();
    this.range = range;
    this.onOpen = onOpen;
  }

  eq(other: SettingsFieldWidget) {
    return (
      other.range.path === this.range.path &&
      other.range.value === this.range.value &&
      other.range.from === this.range.from
    );
  }

  toDOM() {
    const button = document.createElement("button");
    button.type = "button";
    const isColor = this.range.field.kind === "color";
    button.className = isColor ? "cm-settings-swatch" : "cm-settings-font";
    button.setAttribute(
      "aria-label",
      `${isColor ? FIELD_WIDGET_TEXT.pickColor : FIELD_WIDGET_TEXT.pickFont} ${this.range.path}`
    );
    if (isColor) {
      button.style.backgroundColor = this.range.value;
    } else {
      button.textContent = "▾";
    }
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () =>
      this.onOpen({ range: this.range, anchorRect: button.getBoundingClientRect() })
    );
    return button;
  }

  ignoreEvent() {
    return true;
  }
}

function buildDecorations(
  view: EditorView,
  onOpen: (request: SettingsFieldOpenRequest) => void
) {
  const builder = new RangeSetBuilder<Decoration>();
  const fields = findSettingsFields(syntaxTree(view.state), (from, to) =>
    view.state.sliceDoc(from, to)
  );
  for (const range of fields) {
    builder.add(
      range.from,
      range.from,
      Decoration.widget({ widget: new SettingsFieldWidget(range, onOpen), side: -1 })
    );
  }
  return builder.finish();
}

const widgetTheme = EditorView.baseTheme({
  ".cm-settings-swatch, .cm-settings-font": {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "0.95em",
    height: "0.95em",
    marginRight: "0.35em",
    verticalAlign: "-0.1em",
    border: "1px solid var(--border)",
    cursor: "pointer",
    padding: "0",
    fontSize: "inherit",
    lineHeight: "1",
    color: "var(--muted-foreground)",
    backgroundColor: "transparent",
  },
  ".cm-settings-swatch:focus-visible, .cm-settings-font:focus-visible": {
    outline: "1px solid var(--ring)",
  },
});

export function settingsFieldWidgets(
  onOpen: (request: SettingsFieldOpenRequest) => void
): Extension {
  return [
    widgetTheme,
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildDecorations(view, onOpen);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
            this.decorations = buildDecorations(update.view, onOpen);
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    ),
  ];
}
