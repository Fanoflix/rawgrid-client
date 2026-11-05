import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  getChunks,
  goToNextChunk,
  goToPreviousChunk,
  MergeView,
} from "@codemirror/merge";
import { Compartment, EditorSelection } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  placeholder as placeholderExtension,
} from "@codemirror/view";

import type { DiffSide } from "@/tools/differ/lib/constants";
import { DIFFER_COPY } from "@/tools/differ/lib/constants";
import {
  collapseConfig,
  differEditorTheme,
  DROP_TARGET_ATTRIBUTE,
  fontSizeTheme,
  hasDraggedFiles,
  isPasteUpdate,
  isUserDocChange,
  isWholeDocumentUpdate,
  languageExtensions,
  replaceDocument,
} from "@/tools/differ/lib/merge-editor-extensions";
import type { MergeEditorHandle } from "@/tools/differ/lib/use-differ";
import type { DiffSummary } from "@/tools/differ/lib/utils";
import {
  buildDiffConfig,
  findActiveChange,
  summarizeChunks,
} from "@/tools/differ/lib/utils";

interface MergeEditorProps {
  original: string;
  changed: string;
  fontSize: number;
  isJsonMode: boolean;
  isIgnoringWhitespace: boolean;
  isCollapsingUnchanged: boolean;
  onSideChange: (side: DiffSide, text: string, isPaste: boolean) => void;
  onFileDrop: (side: DiffSide, file: File) => void;
  onSummaryChange: (summary: DiffSummary) => void;
  ref?: Ref<MergeEditorHandle>;
}

export function MergeEditor({
  original,
  changed,
  fontSize,
  isJsonMode,
  isIgnoringWhitespace,
  isCollapsingUnchanged,
  onSideChange,
  onFileDrop,
  onSummaryChange,
  ref,
}: MergeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mergeViewRef = useRef<MergeView | null>(null);
  const activeSideRef = useRef<DiffSide>("changed");
  const fontCompartment = useRef(new Compartment());
  const languageCompartment = useRef(new Compartment());
  const latestRef = useRef({
    original,
    changed,
    fontSize,
    isJsonMode,
    isCollapsingUnchanged,
    onSideChange,
    onFileDrop,
    onSummaryChange,
  });

  useEffect(() => {
    latestRef.current = {
      original,
      changed,
      fontSize,
      isJsonMode,
      isCollapsingUnchanged,
      onSideChange,
      onFileDrop,
      onSummaryChange,
    };
  });

  useImperativeHandle(ref, () => ({
    goToChange(direction) {
      const mergeView = mergeViewRef.current;
      if (!mergeView) return;
      const view =
        activeSideRef.current === "original" ? mergeView.a : mergeView.b;
      const command = direction > 0 ? goToNextChunk : goToPreviousChunk;
      command({ state: view.state, dispatch: view.dispatch });
      view.focus();
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const latest = latestRef.current;
    let isReportQueued = false;
    let isRecollapseQueued = false;

    function reportSummary() {
      isReportQueued = false;
      const mergeView = mergeViewRef.current;
      if (!mergeView) return;
      const side = activeSideRef.current;
      const view = side === "original" ? mergeView.a : mergeView.b;
      const chunks = getChunks(view.state)?.chunks ?? mergeView.chunks;
      const activeChange = view.hasFocus
        ? findActiveChange(chunks, side, view.state.selection.main.head)
        : -1;
      latestRef.current.onSummaryChange(
        summarizeChunks(
          chunks,
          mergeView.a.state.doc,
          mergeView.b.state.doc,
          activeChange
        )
      );
    }

    function queueSummary() {
      if (isReportQueued) return;
      isReportQueued = true;
      queueMicrotask(reportSummary);
    }

    function recollapse() {
      isRecollapseQueued = false;
      const mergeView = mergeViewRef.current;
      if (!mergeView || !latestRef.current.isCollapsingUnchanged) return;
      mergeView.reconfigure({ collapseUnchanged: undefined });
      mergeView.reconfigure({ collapseUnchanged: collapseConfig(true) });
    }

    function queueRecollapse() {
      if (isRecollapseQueued) return;
      isRecollapseQueued = true;
      queueMicrotask(recollapse);
    }

    function sideExtensions(side: DiffSide) {
      return [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        lineNumbers(),
        EditorView.lineWrapping,
        placeholderExtension(DIFFER_COPY.placeholders[side]),
        differEditorTheme,
        fontCompartment.current.of(fontSizeTheme(latest.fontSize)),
        languageCompartment.current.of(languageExtensions(latest.isJsonMode)),
        EditorView.contentAttributes.of({
          "aria-label": DIFFER_COPY.sideLabels[side],
          spellcheck: "false",
        }),
        EditorView.updateListener.of((update) => {
          if (update.focusChanged && update.view.hasFocus) {
            activeSideRef.current = side;
          }
          if (isUserDocChange(update)) {
            latestRef.current.onSideChange(
              side,
              update.state.doc.toString(),
              isPasteUpdate(update)
            );
          }
          if (update.docChanged || update.selectionSet || update.focusChanged) {
            queueSummary();
          }
          if (isWholeDocumentUpdate(update)) queueRecollapse();
        }),
      ];
    }

    const mergeView = new MergeView({
      parent: container,
      a: { doc: latest.original, extensions: sideExtensions("original") },
      b: { doc: latest.changed, extensions: sideExtensions("changed") },
      diffConfig: buildDiffConfig(isIgnoringWhitespace),
      collapseUnchanged: collapseConfig(latest.isCollapsingUnchanged),
    });
    mergeView.dom.style.height = "100%";
    mergeViewRef.current = mergeView;
    queueSummary();

    const removeListeners = [
      attachSideListeners(mergeView.a, "original", latestRef),
      attachSideListeners(mergeView.b, "changed", latestRef),
    ];

    return () => {
      removeListeners.forEach((remove) => remove());
      mergeView.destroy();
      mergeViewRef.current = null;
    };
  }, [isIgnoringWhitespace]);

  useEffect(() => {
    const mergeView = mergeViewRef.current;
    if (mergeView) replaceDocument(mergeView.a, original);
  }, [original]);

  useEffect(() => {
    const mergeView = mergeViewRef.current;
    if (mergeView) replaceDocument(mergeView.b, changed);
  }, [changed]);

  useEffect(() => {
    const mergeView = mergeViewRef.current;
    if (!mergeView) return;
    const effects = fontCompartment.current.reconfigure(fontSizeTheme(fontSize));
    mergeView.a.dispatch({ effects });
    mergeView.b.dispatch({ effects });
  }, [fontSize]);

  useEffect(() => {
    const mergeView = mergeViewRef.current;
    if (!mergeView) return;
    const effects = languageCompartment.current.reconfigure(
      languageExtensions(isJsonMode)
    );
    mergeView.a.dispatch({ effects });
    mergeView.b.dispatch({ effects });
  }, [isJsonMode]);

  useEffect(() => {
    mergeViewRef.current?.reconfigure({
      collapseUnchanged: collapseConfig(isCollapsingUnchanged),
    });
  }, [isCollapsingUnchanged]);

  return <div ref={containerRef} className="differ-merge h-full min-h-0" />;
}

interface SideListenerTarget {
  current: { onFileDrop: (side: DiffSide, file: File) => void };
}

function attachSideListeners(
  view: EditorView,
  side: DiffSide,
  latestRef: SideListenerTarget
) {
  const column = view.dom.parentElement;
  if (!column) return () => {};

  function handleDragOver(event: DragEvent) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    column?.setAttribute(DROP_TARGET_ATTRIBUTE, "");
  }

  function handleDragLeave(event: DragEvent) {
    if (column?.contains(event.relatedTarget as Node | null)) return;
    column?.removeAttribute(DROP_TARGET_ATTRIBUTE);
  }

  function handleDrop(event: DragEvent) {
    column?.removeAttribute(DROP_TARGET_ATTRIBUTE);
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    event.preventDefault();
    event.stopPropagation();
    latestRef.current.onFileDrop(side, file);
  }

  function focusEndOnEmptyArea(event: MouseEvent) {
    if (event.target !== column) return;
    event.preventDefault();
    view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
    view.focus();
  }

  column.addEventListener("dragover", handleDragOver, true);
  column.addEventListener("dragleave", handleDragLeave, true);
  column.addEventListener("drop", handleDrop, true);
  column.addEventListener("mousedown", focusEndOnEmptyArea);

  return () => {
    column.removeEventListener("dragover", handleDragOver, true);
    column.removeEventListener("dragleave", handleDragLeave, true);
    column.removeEventListener("drop", handleDrop, true);
    column.removeEventListener("mousedown", focusEndOnEmptyArea);
  };
}
