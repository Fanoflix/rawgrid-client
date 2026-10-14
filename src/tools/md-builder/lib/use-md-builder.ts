import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFont } from "@/lib/use-font";
import { useToolHistory } from "@/lib/use-tool-history";
import {
  DEFAULT_DOCUMENT_NAME,
  MD_BUILDER_CONFIG,
  MD_BUILDER_TEXT,
  PASTED_DOCUMENT_NAME,
} from "@/tools/md-builder/lib/constants";
import type { ReviewComment } from "@/tools/md-builder/lib/critic-markup";
import {
  containsCriticMarkup,
  exportCriticMarkup,
  overlapsComment,
  parseCriticMarkup,
  sortComments,
} from "@/tools/md-builder/lib/critic-markup";
import type { LoadedFile } from "@/tools/md-builder/lib/file-access";
import {
  downloadMarkdown,
  droppedFileHandle,
  hasFileSystemAccess,
  lastModifiedOf,
  pickMarkdownFile,
  pickSaveLocation,
  readFile,
  readHandle,
  recallHandle,
  rememberHandle,
  requestHandlePermission,
  writeHandle,
} from "@/tools/md-builder/lib/file-access";
import {
  PENDING_COMMENT_ID,
  renderMarkdown,
} from "@/tools/md-builder/lib/render-markdown";
import type { SourceRange } from "@/tools/md-builder/lib/selection";
import {
  clearSelection,
  selectedSourceRange,
  selectionRect,
} from "@/tools/md-builder/lib/selection";
import { isAgentComment } from "@/tools/md-builder/lib/utils";

export interface ReviewDocument {
  name: string;
  source: string;
  comments: ReviewComment[];
  nextId: number;
}

export interface SelectionAnchor {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PendingSelection {
  range: SourceRange;
  anchor: SelectionAnchor;
}

export interface CommentComposer extends PendingSelection {
  quote: string;
}

export interface Confirmation {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export type MdBuilderView = "document" | "paste";

export interface MdBuilderState {
  name: string;
  source: string;
  comments: ReviewComment[];
  html: string;
  hasDocument: boolean;
  hasHandle: boolean;
  hasFileSystemAccess: boolean;
  rememberedName: string | null;
  isDirty: boolean;
  isStale: boolean;
  isDragging: boolean;
  isReady: boolean;
  view: MdBuilderView;
  activeCommentId: number | null;
  pendingSelection: PendingSelection | null;
  composer: CommentComposer | null;
  confirmation: Confirmation | null;
  notice: string | null;
  fontSize: number;
  isCommentsCollapsed: boolean;
  hoveredCommentId: number | null;
  focusTick: number;
  agentCommentIds: ReadonlySet<number>;
}

const EMPTY_DOCUMENT: ReviewDocument = {
  name: DEFAULT_DOCUMENT_NAME,
  source: "",
  comments: [],
  nextId: 1,
};

const NOTICE_MS = 3200;

function documentFromMarkdown(text: string, name: string): ReviewDocument {
  const parsed = parseCriticMarkup(text);
  return {
    name,
    source: parsed.source,
    comments: parsed.comments.map((comment, index) => ({
      ...comment,
      id: index + 1,
    })),
    nextId: parsed.comments.length + 1,
  };
}

function serializeDocument(reviewDoc: ReviewDocument) {
  return JSON.stringify({
    name: reviewDoc.name,
    markdown: exportCriticMarkup(reviewDoc.source, reviewDoc.comments),
  });
}

function deserializeDocument(raw: string): ReviewDocument {
  try {
    const parsed = JSON.parse(raw) as { name?: string; markdown?: string };
    if (typeof parsed?.markdown !== "string") return { ...EMPTY_DOCUMENT };
    return documentFromMarkdown(
      parsed.markdown,
      parsed.name || DEFAULT_DOCUMENT_NAME
    );
  } catch {
    return { ...EMPTY_DOCUMENT };
  }
}

function anchorWithin(container: HTMLElement, rect: DOMRect): SelectionAnchor {
  const containerRect = container.getBoundingClientRect();
  return {
    top: rect.top - containerRect.top + container.scrollTop,
    left: rect.left - containerRect.left + container.scrollLeft,
    width: rect.width,
    height: rect.height,
  };
}

export function useMdBuilder() {
  const initialValue = useMemo(() => ({ ...EMPTY_DOCUMENT }), []);
  const {
    value: reviewDoc,
    setValue: setReviewDoc,
    isReady,
  } = useToolHistory<ReviewDocument>({
    tool: "md-builder",
    initialValue,
    serialize: serializeDocument,
    deserialize: deserializeDocument,
  });

  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [lastModified, setLastModified] = useState(0);
  const [rememberedHandle, setRememberedHandle] =
    useState<FileSystemFileHandle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [view, setView] = useState<MdBuilderView>("document");
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [pendingSelection, setPendingSelection] =
    useState<PendingSelection | null>(null);
  const [composer, setComposer] = useState<CommentComposer | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(false);
  const [hoveredCommentId, setHoveredCommentId] = useState<number | null>(
    null
  );
  const [focusTick, setFocusTick] = useState(0);
  const documentScrollTopRef = useRef(0);

  const documentRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const noticeTimerRef = useRef<number | null>(null);

  const { fontSize, increaseFont, decreaseFont } = useFont({
    defaultSize: MD_BUILDER_CONFIG.defaultFontSize,
    minSize: MD_BUILDER_CONFIG.minFontSize,
    maxSize: MD_BUILDER_CONFIG.maxFontSize,
  });

  const agentCommentIds = useMemo(
    () =>
      new Set(
        reviewDoc.comments
          .filter((comment) => isAgentComment(comment.notes))
          .map((comment) => comment.id)
      ),
    [reviewDoc.comments]
  );

  const html = useMemo(() => {
    const pendingHighlight: ReviewComment[] = composer
      ? [
          {
            id: PENDING_COMMENT_ID,
            start: composer.range.start,
            end: composer.range.end,
            notes: [],
          },
        ]
      : [];
    return renderMarkdown(
      reviewDoc.source,
      [...reviewDoc.comments, ...pendingHighlight],
      { agentCommentIds }
    );
  }, [reviewDoc.source, reviewDoc.comments, composer, agentCommentIds]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(
      () => setNotice(null),
      NOTICE_MS
    );
  }, []);

  useEffect(() => {
    if (!hasFileSystemAccess) return;
    let isMounted = true;
    recallHandle().then((recalled) => {
      if (isMounted) setRememberedHandle(recalled);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const loadDocument = useCallback(
    (loaded: LoadedFile) => {
      setReviewDoc(documentFromMarkdown(loaded.text, loaded.name));
      setHandle(loaded.handle);
      setLastModified(loaded.lastModified);
      setIsDirty(false);
      setIsStale(false);
      setActiveCommentId(null);
      setComposer(null);
      setPendingSelection(null);
      setView("document");
      if (loaded.handle) {
        setRememberedHandle(loaded.handle);
        rememberHandle(loaded.handle);
      }
    },
    [setReviewDoc]
  );

  const openHandle = useCallback(
    async (nextHandle: FileSystemFileHandle) => {
      try {
        loadDocument(await readHandle(nextHandle));
      } catch {
        showNotice(MD_BUILDER_TEXT.loadError);
      }
    },
    [loadDocument, showNotice]
  );

  const openCopy = useCallback(
    async (file: File) => {
      try {
        loadDocument(await readFile(file));
      } catch {
        showNotice(MD_BUILDER_TEXT.loadError);
      }
    },
    [loadDocument, showNotice]
  );

  const guardUnsaved = useCallback(
    (action: () => void, confirmLabel: string) => {
      if (!isDirty) {
        action();
        return;
      }
      setConfirmation({
        message: MD_BUILDER_TEXT.discardPrompt,
        confirmLabel,
        onConfirm: action,
      });
    },
    [isDirty]
  );

  const pickAndOpen = useCallback(async () => {
    if (!hasFileSystemAccess) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const picked = await pickMarkdownFile();
      if (picked) await openHandle(picked);
    } catch {
      fileInputRef.current?.click();
    }
  }, [openHandle]);

  function openFile() {
    guardUnsaved(() => void pickAndOpen(), MD_BUILDER_TEXT.open);
  }

  const uploadFile = useCallback(() => {
    guardUnsaved(() => fileInputRef.current?.click(), MD_BUILDER_TEXT.upload);
  }, [guardUnsaved]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void openCopy(file);
    event.target.value = "";
  }

  function reopenRemembered() {
    if (!rememberedHandle) return;
    guardUnsaved(async () => {
      try {
        if (!(await requestHandlePermission(rememberedHandle))) {
          showNotice(MD_BUILDER_TEXT.permissionError);
          return;
        }
        await openHandle(rememberedHandle);
      } catch {
        showNotice(MD_BUILDER_TEXT.loadError);
      }
    }, MD_BUILDER_TEXT.reopen);
  }

  const refresh = useCallback(() => {
    if (!handle) return;
    guardUnsaved(() => void openHandle(handle), MD_BUILDER_TEXT.refresh);
  }, [guardUnsaved, handle, openHandle]);

  const exportedMarkdown = useCallback(
    () => exportCriticMarkup(reviewDoc.source, reviewDoc.comments),
    [reviewDoc.source, reviewDoc.comments]
  );

  const writeTo = useCallback(
    async (target: FileSystemFileHandle) => {
      try {
        const modified = await writeHandle(target, exportedMarkdown());
        setHandle(target);
        setLastModified(modified);
        setIsDirty(false);
        setIsStale(false);
        setRememberedHandle(target);
        rememberHandle(target);
        setReviewDoc((previous) =>
          previous.name === target.name
            ? previous
            : { ...previous, name: target.name }
        );
      } catch {
        showNotice(MD_BUILDER_TEXT.saveError);
      }
    },
    [exportedMarkdown, setReviewDoc, showNotice]
  );

  const save = useCallback(async () => {
    if (!reviewDoc.source) return;
    if (!hasFileSystemAccess) {
      downloadMarkdown(exportedMarkdown(), reviewDoc.name);
      return;
    }
    if (!handle) {
      try {
        const target = await pickSaveLocation(reviewDoc.name);
        if (target) await writeTo(target);
      } catch {
        showNotice(MD_BUILDER_TEXT.saveError);
      }
      return;
    }
    const onDisk = await lastModifiedOf(handle);
    if (onDisk !== null && onDisk !== lastModified) {
      setConfirmation({
        message: MD_BUILDER_TEXT.diskChangedPrompt,
        confirmLabel: MD_BUILDER_TEXT.save,
        onConfirm: () => void writeTo(handle),
      });
      return;
    }
    await writeTo(handle);
  }, [
    exportedMarkdown,
    handle,
    lastModified,
    reviewDoc.name,
    reviewDoc.source,
    showNotice,
    writeTo,
  ]);

  function download() {
    if (!reviewDoc.source) return;
    downloadMarkdown(exportedMarkdown(), reviewDoc.name);
  }

  const copyMarkdown = useCallback(async () => {
    if (!reviewDoc.source) return;
    await navigator.clipboard.writeText(exportedMarkdown());
    showNotice("copied");
  }, [exportedMarkdown, reviewDoc.source, showNotice]);

  async function copyAgentBrief() {
    await navigator.clipboard.writeText(MD_BUILDER_TEXT.agentBrief);
    showNotice("copied agent brief");
  }

  const showPasteView = useCallback(() => {
    guardUnsaved(() => setView("paste"), MD_BUILDER_TEXT.paste);
  }, [guardUnsaved]);

  function cancelPaste() {
    setView("document");
  }

  function loadPastedText(text: string) {
    if (!text.trim()) return;
    loadDocument({
      text,
      name: PASTED_DOCUMENT_NAME,
      handle: null,
      lastModified: 0,
    });
  }

  function closeDocument() {
    guardUnsaved(() => {
      setReviewDoc({ ...EMPTY_DOCUMENT });
      setHandle(null);
      setLastModified(0);
      setIsDirty(false);
      setIsStale(false);
      setActiveCommentId(null);
      setComposer(null);
      setPendingSelection(null);
    }, MD_BUILDER_TEXT.close);
  }

  function confirmPending() {
    const pending = confirmation;
    setConfirmation(null);
    pending?.onConfirm();
  }

  function cancelConfirmation() {
    setConfirmation(null);
  }

  useEffect(() => {
    if (!handle) return;
    let isMounted = true;

    async function checkDisk() {
      const onDisk = await lastModifiedOf(handle!);
      if (!isMounted || onDisk === null) return;
      setIsStale(onDisk !== lastModified);
    }

    const interval = window.setInterval(
      checkDisk,
      MD_BUILDER_CONFIG.diskPollMs
    );
    window.addEventListener("focus", checkDisk);
    document.addEventListener("visibilitychange", checkDisk);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", checkDisk);
      document.removeEventListener("visibilitychange", checkDisk);
    };
  }, [handle, lastModified]);

  useEffect(() => {
    if (!isDirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    if (composer || !reviewDoc.source) return;
    let frame = 0;

    function updateSelection() {
      frame = 0;
      const container = documentRef.current;
      if (!container) return;
      const range = selectedSourceRange(container, reviewDoc.source);
      const rect = range ? selectionRect() : null;
      setPendingSelection(
        range && rect ? { range, anchor: anchorWithin(container, rect) } : null
      );
    }

    function scheduleUpdate() {
      if (!frame) frame = window.requestAnimationFrame(updateSelection);
    }

    document.addEventListener("selectionchange", scheduleUpdate);
    return () => {
      document.removeEventListener("selectionchange", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [composer, reviewDoc.source]);

  useEffect(
    () => () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    },
    []
  );

  function updateComments(
    update: (comments: ReviewComment[]) => ReviewComment[]
  ) {
    setReviewDoc((previous) => ({
      ...previous,
      comments: update(previous.comments),
    }));
    setIsDirty(true);
  }

  function beginComment() {
    if (!pendingSelection) return;
    const { range, anchor } = pendingSelection;
    const quote = reviewDoc.source.slice(range.start, range.end);
    if (containsCriticMarkup(quote)) {
      showNotice(MD_BUILDER_TEXT.markupError);
      return;
    }
    if (overlapsComment(reviewDoc.comments, range.start, range.end)) {
      showNotice(MD_BUILDER_TEXT.overlapError);
      return;
    }
    setComposer({ range, anchor, quote });
    setPendingSelection(null);
  }

  function cancelComment() {
    setComposer(null);
  }

  function submitComment(note: string) {
    const trimmed = note.trim();
    if (!composer || !trimmed) return;
    const id = reviewDoc.nextId;
    setReviewDoc((previous) => ({
      ...previous,
      nextId: previous.nextId + 1,
      comments: [
        ...previous.comments,
        { id, start: composer.range.start, end: composer.range.end, notes: [trimmed] },
      ],
    }));
    setIsDirty(true);
    setComposer(null);
    clearSelection();
    setActiveCommentId(id);
  }

  function addReply(commentId: number, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;
    updateComments((comments) =>
      comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, notes: [...comment.notes, trimmed] }
          : comment
      )
    );
    setActiveCommentId(commentId);
  }

  function editNote(commentId: number, noteIndex: number, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;
    updateComments((comments) =>
      comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              notes: comment.notes.map((existing, index) =>
                index === noteIndex ? trimmed : existing
              ),
            }
          : comment
      )
    );
  }

  function deleteNote(commentId: number, noteIndex: number) {
    updateComments((comments) =>
      comments.flatMap((comment) => {
        if (comment.id !== commentId) return [comment];
        const notes = comment.notes.filter((_, index) => index !== noteIndex);
        return notes.length ? [{ ...comment, notes }] : [];
      })
    );
    setActiveCommentId((current) => (current === commentId ? null : current));
  }

  function focusComment(commentId: number | null) {
    setActiveCommentId(commentId);
    if (commentId === null) return;
    setIsCommentsCollapsed(false);
    setFocusTick((tick) => tick + 1);
  }

  function hoverComment(commentId: number | null) {
    setHoveredCommentId(commentId);
  }

  function toggleCommentsCollapsed() {
    documentScrollTopRef.current = documentRef.current?.scrollTop ?? 0;
    setIsCommentsCollapsed((current) => !current);
  }

  function handleDragEnter(event: DragEvent) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  }

  function handleDragOver(event: DragEvent) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
  }

  function handleDragLeave(event: DragEvent) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  }

  function handleDrop(event: DragEvent) {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    const pendingHandle = droppedFileHandle(event.dataTransfer);
    guardUnsaved(() => {
      if (!pendingHandle) {
        if (file) void openCopy(file);
        return;
      }
      pendingHandle
        .then((dropped) => {
          if (dropped && dropped.kind === "file") {
            return openHandle(dropped as FileSystemFileHandle);
          }
          if (file) return openCopy(file);
        })
        .catch(() => {
          if (file) void openCopy(file);
        });
    }, MD_BUILDER_TEXT.open);
  }

  const state: MdBuilderState = {
    name: reviewDoc.name,
    source: reviewDoc.source,
    comments: sortComments(reviewDoc.comments),
    html,
    hasDocument: reviewDoc.source.length > 0,
    hasHandle: handle !== null,
    hasFileSystemAccess,
    rememberedName: rememberedHandle?.name ?? null,
    isDirty,
    isStale,
    isDragging,
    isReady,
    view,
    activeCommentId,
    pendingSelection,
    composer,
    confirmation,
    notice,
    fontSize,
    isCommentsCollapsed,
    hoveredCommentId,
    focusTick,
    agentCommentIds,
  };

  return {
    state,
    documentRef,
    fileInputRef,
    openFile,
    uploadFile,
    handleFileChange,
    reopenRemembered,
    refresh,
    save,
    download,
    copyMarkdown,
    copyAgentBrief,
    showPasteView,
    cancelPaste,
    loadPastedText,
    closeDocument,
    confirmPending,
    cancelConfirmation,
    beginComment,
    cancelComment,
    submitComment,
    addReply,
    editNote,
    deleteNote,
    focusComment,
    hoverComment,
    toggleCommentsCollapsed,
    documentScrollTopRef,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    increaseFont,
    decreaseFont,
  };
}
