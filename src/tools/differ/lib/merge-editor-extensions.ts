import { json } from "@codemirror/lang-json";
import { syntaxHighlighting } from "@codemirror/language";
import {
  Annotation,
  type Extension,
  type Transaction,
} from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";

import { jsonTagHighlighter } from "@/lib/json-highlight";
import { DIFFER_CONFIG } from "@/tools/differ/lib/constants";

export const externalSync = Annotation.define<boolean>();

export const DROP_TARGET_ATTRIBUTE = "data-drop-target";

export const differEditorTheme = EditorView.theme({
  "&": { backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-code)",
    lineHeight: "1.5",
  },
  ".cm-content": {
    padding: "6px 0",
    color: "var(--foreground)",
    caretColor: "var(--foreground)",
  },
  ".cm-line": { padding: "0 8px 0 4px" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 4px 0 8px",
    minWidth: "2ch",
    opacity: "0.6",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
    { backgroundColor: "color-mix(in oklab, var(--primary) 25%, transparent)" },
});

const jsonContentTheme = EditorView.theme({
  ".cm-content": { color: "var(--json-punctuation)" },
});

export function fontSizeTheme(fontSize: number) {
  return EditorView.theme({ ".cm-scroller": { fontSize: `${fontSize}px` } });
}

export function languageExtensions(isJsonMode: boolean): Extension {
  if (!isJsonMode) return [];
  return [json(), syntaxHighlighting(jsonTagHighlighter), jsonContentTheme];
}

export function collapseConfig(isCollapsingUnchanged: boolean) {
  if (!isCollapsingUnchanged) return undefined;
  return {
    margin: DIFFER_CONFIG.collapseMargin,
    minSize: DIFFER_CONFIG.collapseMinSize,
  };
}

export function isUserDocChange(update: ViewUpdate) {
  return (
    update.docChanged &&
    update.transactions.some(
      (transaction) =>
        transaction.docChanged && !transaction.annotation(externalSync)
    )
  );
}

export function isPasteUpdate(update: ViewUpdate) {
  return update.transactions.some((transaction) =>
    transaction.isUserEvent("input.paste")
  );
}

function replacesWholeDocument(transaction: Transaction) {
  const previousLength = transaction.startState.doc.length;
  let isWhole = false;
  transaction.changes.iterChangedRanges((from, to) => {
    if (from === 0 && to === previousLength) isWhole = true;
  });
  return isWhole;
}

export function isWholeDocumentUpdate(update: ViewUpdate) {
  return update.transactions.some(
    (transaction) => transaction.docChanged && replacesWholeDocument(transaction)
  );
}

export function replaceDocument(view: EditorView, text: string) {
  const current = view.state.doc.toString();
  if (current === text) return;
  view.dispatch({
    changes: { from: 0, to: current.length, insert: text },
    annotations: externalSync.of(true),
  });
}

export function hasDraggedFiles(event: DragEvent) {
  return Boolean(event.dataTransfer?.types.includes("Files"));
}
