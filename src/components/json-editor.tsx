import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MouseEvent,
  type Ref,
} from "react";
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

import {
  getBracketClass,
  isBracket,
  jsonTagHighlighter,
} from "@/lib/json-highlight";
import { Button } from "@/components/ui/button";
import { findJsonPropertyOnLine } from "@/lib/json-property";
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

const LINE_GAP_PX = 9;
const WRAPPED_LINE_HEIGHT = "1.2";
const COPY_BUTTONS_GUTTER = "10px";
const COPY_BUTTON_SIZE_PX = 16;
const COPY_BUTTONS_WIDTH_PX = COPY_BUTTON_SIZE_PX * 2 + 2;
const COPY_BUTTONS_OFFSET_PX = 2;
const COPIED_FEEDBACK_MS = 1200;

interface HoveredJsonProperty {
  top: number;
  left: number;
  lineHighlightTop: number;
  lineHighlightHeight: number;
  keyText: string;
  valueText: string | null;
}

type CopiedPart = "key" | "value";

const theme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    lineHeight: WRAPPED_LINE_HEIGHT,
    overflow: "auto",
  },
  ".cm-content": {
    padding: `8px 12px 8px calc(12px + ${COPY_BUTTONS_GUTTER})`,
    color: "var(--json-punctuation)",
    caretColor: "var(--foreground)",
  },
  ".cm-line": { padding: `0 0 ${LINE_GAP_PX}px 0` },
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
          Decoration.mark({ class: getBracketClass(node.node) }),
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
  { decorations: (plugin) => plugin.decorations },
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
  const [hoveredProperty, setHoveredProperty] =
    useState<HoveredJsonProperty | null>(null);
  const [copiedPart, setCopiedPart] = useState<CopiedPart | null>(null);
  const copiedFeedbackTimerRef = useRef<number | undefined>(undefined);

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
    view.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: value },
    });
  }, [value]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: fontSizeCompartment.current.reconfigure(fontSizeTheme(fontSize)),
    });
  }, [fontSize]);

  function showCopyButtonsForHoveredLine(event: MouseEvent<HTMLDivElement>) {
    const view = viewRef.current;
    const wrapper = event.currentTarget;
    const hoveredPosition = view?.posAtCoords({
      x: event.clientX,
      y: event.clientY,
    });
    if (!view || hoveredPosition === null || hoveredPosition === undefined) {
      setHoveredProperty(null);
      return;
    }

    const line = view.state.doc.lineAt(hoveredPosition);
    const property = findJsonPropertyOnLine(
      syntaxTree(view.state),
      (from, to) => view.state.sliceDoc(from, to),
      line.from,
      line.to,
    );
    const propertyCoords = property
      ? view.coordsAtPos(property.propertyStart)
      : null;
    if (!property || !propertyCoords) {
      setHoveredProperty(null);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const lineBlock = view.lineBlockAt(line.from);
    const firstRowHeight = propertyCoords.bottom - propertyCoords.top;
    setHoveredProperty({
      top:
        propertyCoords.top -
        wrapperRect.top +
        (firstRowHeight - COPY_BUTTON_SIZE_PX) / 2,
      left: Math.max(
        0,
        propertyCoords.left -
          wrapperRect.left -
          COPY_BUTTONS_WIDTH_PX -
          COPY_BUTTONS_OFFSET_PX,
      ),
      lineHighlightTop:
        view.documentTop + lineBlock.top - wrapperRect.top - LINE_GAP_PX / 2,
      lineHighlightHeight: lineBlock.height,
      keyText: property.keyText,
      valueText: property.valueText,
    });
  }

  async function copyPart(part: CopiedPart, text: string | null) {
    if (text === null) return;
    await navigator.clipboard.writeText(text);
    setCopiedPart(part);
    window.clearTimeout(copiedFeedbackTimerRef.current);
    copiedFeedbackTimerRef.current = window.setTimeout(
      () => setCopiedPart(null),
      COPIED_FEEDBACK_MS,
    );
  }

  return (
    <div
      className={cn("relative h-full w-full min-h-0", className)}
      onMouseMove={showCopyButtonsForHoveredLine}
      onMouseLeave={() => setHoveredProperty(null)}
      onScrollCapture={() => setHoveredProperty(null)}
    >
      <div ref={containerRef} className="h-full w-full min-h-0" />
      {hoveredProperty && (
        <div
          className="pointer-events-none absolute inset-x-0 bg-foreground/5"
          style={{
            top: hoveredProperty.lineHighlightTop,
            height: hoveredProperty.lineHighlightHeight,
          }}
        />
      )}
      {hoveredProperty && (
        <div
          className="absolute z-10 flex gap-0.5"
          style={{ top: hoveredProperty.top, left: hoveredProperty.left }}
        >
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => copyPart("key", hoveredProperty.keyText)}
            aria-label={`copy key ${hoveredProperty.keyText}`}
            title="copy key"
            className={cn(
              "size-4 font-mono text-[10px] leading-none",
              copiedPart === "key" && "text-green-500 hover:text-green-500",
            )}
          >
            k
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => copyPart("value", hoveredProperty.valueText)}
            disabled={hoveredProperty.valueText === null}
            aria-label={`copy value of ${hoveredProperty.keyText}`}
            title="copy value"
            className={cn(
              "size-4 font-mono text-[10px] leading-none",
              copiedPart === "value" && "text-green-500 hover:text-green-500",
            )}
          >
            v
          </Button>
        </div>
      )}
    </div>
  );
}

function fontSizeTheme(fontSize: number) {
  return EditorView.theme({ ".cm-scroller": { fontSize: `${fontSize}px` } });
}
