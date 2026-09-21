import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import {
  indentUnit,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { Compartment, EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  placeholder as placeholderExtension,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

import { getBracketClass, isBracket, jsonTagHighlighter } from "@/lib/json-highlight";
import { cn } from "@/lib/utils";

export interface JsonEditorHandle {
  /** Empties the editor as an edit, so ctrl+z brings the text back. */
  clear: () => void;
}

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  fontSize: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  ref?: Ref<JsonEditorHandle>;
}

// Tab is swallowed rather than inserting a tab or moving focus out; Enter
// indents from the json structure (deeper after "{" / "[", closing brackets
// line up with their opener).
const swallowTab = keymap.of([
  { key: "Tab", run: () => true, shift: () => true },
]);

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    lineHeight: "1.5",
    overflow: "auto",
  },
  ".cm-content": {
    padding: "8px 10px",
    color: "var(--json-punctuation)",
    caretColor: "var(--foreground)",
  },
  ".cm-line": { padding: "0" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection":
    { backgroundColor: "color-mix(in oklab, var(--primary) 25%, transparent)" },
});

function getBracketDecorations(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (!isBracket(node.name)) return;
        builder.add(
          node.from,
          node.to,
          Decoration.mark({ class: getBracketClass(node.node) })
        );
      },
    });
  }
  return builder.finish();
}

// Colors each {} / [] pair by nesting depth, like editors' bracket pair
// colorization. CodeMirror has no built-in for this.
const bracketDepthColors = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getBracketDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = getBracketDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
);

export function JsonEditor({
  value,
  onChange,
  fontSize,
  placeholder = "",
  ariaLabel,
  className,
  ref,
}: JsonEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const fontSizeCompartment = useRef(new Compartment());

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    clear() {
      const view = viewRef.current;
      if (!view || view.state.doc.length === 0) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length } });
      view.focus();
    },
  }));

  // Created once; value and font size are pushed in by the effects below.
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          swallowTab,
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          json(),
          syntaxHighlighting(jsonTagHighlighter),
          bracketDepthColors,
          indentUnit.of("  "),
          EditorView.lineWrapping,
          placeholderExtension(placeholder),
          theme,
          fontSizeCompartment.current.of(fontSizeTheme(fontSize)),
          EditorView.contentAttributes.of({
            "aria-label": ariaLabel ?? "",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outside changes (a new token, a reformat) replace the document. Skipped
  // when the editor already holds the value, i.e. it came from typing.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc === value) return;
    view.dispatch({ changes: { from: 0, to: currentDoc.length, insert: value } });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: fontSizeCompartment.current.reconfigure(fontSizeTheme(fontSize)),
    });
  }, [fontSize]);

  return (
    <div ref={containerRef} className={cn("h-full w-full min-h-0", className)} />
  );
}

function fontSizeTheme(fontSize: number) {
  return EditorView.theme({ ".cm-scroller": { fontSize: `${fontSize}px` } });
}
