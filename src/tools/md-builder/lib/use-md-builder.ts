import type { ChangeEvent, DragEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ClientMcpCallResult,
  ClientMcpImage,
  ClientMcpLocated,
  ClientMcpLocateRequest,
} from "@/lib/client-mcp";
import { useFont } from "@/lib/use-font";
import { useToolState } from "@/lib/use-tool-state";
import {
  DEFAULT_DOCUMENT_NAME,
  AGENT_STATUS_MAX_LENGTH,
  CANCEL_SHORTCUT,
  LIVE_TOOL_NAMES,
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
import type {
  AgentCall,
  DroppedOp,
  LiveLog,
  ReviewDocument,
  UserOp,
} from "@/tools/md-builder/lib/live-sync";
import {
  addedNoteKeys,
  agentCallFrom,
  applyAgentCall,
  applyUserOp,
  documentSnapshot,
  emptyLog,
  eventForAgent,
  imageRequestFrom,
  mapPendingThroughChange,
  mapPosition,
  noteKeyFor,
  parseThreadKey,
  publishUserChanges,
  rebasePending,
  rejectionMessage,
  reopenRange,
  userEventsSince,
  withNoteTime,
} from "@/tools/md-builder/lib/live-sync";
import {
  imageSources,
  PENDING_COMMENT_ID,
  renderMarkdown,
} from "@/tools/md-builder/lib/render-markdown";
import type { SourceRange } from "@/tools/md-builder/lib/selection";
import {
  clearSelection,
  selectedSourceRange,
  selectionRect,
} from "@/tools/md-builder/lib/selection";
import { useLiveMode } from "@/tools/md-builder/lib/use-live-mode";
import {
  agentBriefFor,
  firstLineOf,
  imageMarkdown,
  isCommentShortcut,
  relativeImagePath,
  resolveImageSource,
} from "@/tools/md-builder/lib/utils";

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

export type SidebarTab = "comments" | "resolved";

export interface ResolvedThread {
  key: string;
  documentName: string;
  quote: string;
  notes: string[];
  resolvedAt: number;
}

export interface ResolvedThreadView extends ResolvedThread {
  canReopen: boolean;
}

export interface AgentStatus {
  isWorking: boolean;
  text: string;
  threadId: number | null;
}

export interface IncomingNote {
  threadId: number;
  tick: number;
}

export interface MdBuilderState {
  name: string;
  source: string;
  comments: ReviewComment[];
  html: string;
  hasDocument: boolean;
  hasHandle: boolean;
  canSave: boolean;
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
  isCopied: boolean;
  fontSize: number;
  isCommentsCollapsed: boolean;
  hoveredCommentId: number | null;
  focusTick: number;
  newNoteKeys: ReadonlySet<string>;
  newThreadIds: number[];
  droppedNotes: DroppedOp[];
  sidebarTab: SidebarTab;
  resolvedThreads: ResolvedThreadView[];
  incomingNote: IncomingNote | null;
  agentStatus: AgentStatus | null;
  isAgentAway: boolean;
  pendingAgentReplies: Record<number, string>;
  documentPath: string | null;
}

interface LiveFiles {
  canReadFiles: boolean;
  locateDocument: (request: ClientMcpLocateRequest) => Promise<ClientMcpLocated>;
  readImage: (path: string, includeData: boolean) => Promise<ClientMcpImage>;
}

interface SyncState {
  published: ReviewDocument | null;
  pending: UserOp[];
  log: LiveLog;
}

interface LoadOptions {
  isRefresh: boolean;
}

const EMPTY_DOCUMENT: ReviewDocument = {
  name: DEFAULT_DOCUMENT_NAME,
  source: "",
  comments: [],
  nextId: 1,
};

const NOTICE_MS = 3200;
const PAGE_LOAD_SEQ = Date.now();
const NO_KEYS: string[] = [];
const NO_RESOLVED: ResolvedThread[] = [];
const MAX_RESOLVED = 300;

function documentFromMarkdown(text: string, name: string, firstId = 1): ReviewDocument {
  const parsed = parseCriticMarkup(text);
  return {
    name,
    source: parsed.source,
    comments: parsed.comments.map((comment, index) => ({
      ...comment,
      id: firstId + index,
    })),
    nextId: firstId + parsed.comments.length,
  };
}

function serializeFlag(value: boolean) {
  return value ? "1" : "0";
}

function deserializeFlag(raw: string) {
  return raw === "1";
}

function serializeKeys(keys: string[]) {
  return JSON.stringify(keys);
}

const NOT_LOCATED: ClientMcpLocated = { path: null, candidates: [] };
const NO_PATHS: Record<string, string> = {};
const MAX_REMEMBERED_PATHS = 50;

function documentKey(name: string, firstLine: string) {
  return `${name}\n${firstLine}`;
}

function serializePaths(paths: Record<string, string>) {
  return JSON.stringify(paths);
}

function deserializePaths(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return NO_PATHS;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    );
  } catch {
    return NO_PATHS;
  }
}

function deserializeKeys(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function serializeResolved(threads: ResolvedThread[]) {
  return JSON.stringify(threads);
}

function isResolvedThread(value: unknown): value is ResolvedThread {
  if (!value || typeof value !== "object") return false;
  const thread = value as Record<string, unknown>;
  return (
    typeof thread.key === "string" &&
    typeof thread.documentName === "string" &&
    typeof thread.quote === "string" &&
    typeof thread.resolvedAt === "number" &&
    Array.isArray(thread.notes) &&
    thread.notes.every((note) => typeof note === "string")
  );
}

function deserializeResolved(raw: string) {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isResolvedThread) : [];
  } catch {
    return [];
  }
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

function currentNoteTime() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function clampSeconds(value: unknown) {
  const seconds = typeof value === "number" ? value : MD_BUILDER_CONFIG.waitDefaultSeconds;
  return Math.min(MD_BUILDER_CONFIG.waitMaxSeconds, Math.max(1, Math.round(seconds)));
}

export function useMdBuilder() {
  const initialValue = useMemo(() => ({ ...EMPTY_DOCUMENT }), []);
  const {
    value: reviewDoc,
    setValue: setReviewDoc,
    isReady,
  } = useToolState<ReviewDocument>({
    tool: "md-builder",
    initialValue,
    serialize: serializeDocument,
    deserialize: deserializeDocument,
  });
  const { value: newNoteKeyList, setValue: setNewNoteKeyList } = useToolState<string[]>({
    tool: "md-builder:new-notes",
    initialValue: NO_KEYS,
    serialize: serializeKeys,
    deserialize: deserializeKeys,
  });
  const { value: resolvedList, setValue: setResolvedList } = useToolState<ResolvedThread[]>({
    tool: "md-builder:resolved",
    initialValue: NO_RESOLVED,
    serialize: serializeResolved,
    deserialize: deserializeResolved,
  });
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("comments");
  const [incomingNote, setIncomingNote] = useState<IncomingNote | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [isAgentAway, setIsAgentAway] = useState(false);
  const activeAgentCallsRef = useRef(0);
  const agentAwayTimerRef = useRef<number | null>(null);
  const [pendingReplySeqs, setPendingReplySeqs] = useState<Record<number, number>>({});
  const isLiveRef = useRef(false);
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const documentPathRef = useRef<string | null>(null);
  const [imageUrlsByPath, setImageUrlsByPath] = useState<Record<string, string>>({});
  const requestedImagesRef = useRef(new Set<string>());
  const liveFilesRef = useRef<LiveFiles | null>(null);
  const { value: rememberedPaths, setValue: setRememberedPaths } = useToolState<Record<string, string>>({
    tool: "md-builder:document-paths",
    initialValue: NO_PATHS,
    serialize: serializePaths,
    deserialize: deserializePaths,
  });
  const rememberedPathsRef = useRef(rememberedPaths);

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
  const [isCopied, setIsCopied] = useState(false);
  const [droppedNotes, setDroppedNotes] = useState<DroppedOp[]>([]);
  const copiedTimerRef = useRef<number | null>(null);
  const { value: isCommentsCollapsed, setValue: setIsCommentsCollapsed } =
    useToolState<boolean>({
      tool: "md-builder:comments-collapsed",
      initialValue: false,
      serialize: serializeFlag,
      deserialize: deserializeFlag,
    });
  const [hoveredCommentId, setHoveredCommentId] = useState<number | null>(
    null
  );
  const [focusTick, setFocusTick] = useState(0);
  const documentScrollTopRef = useRef(0);

  const documentRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const noticeTimerRef = useRef<number | null>(null);

  const viewRef = useRef<ReviewDocument>(reviewDoc);
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const lastModifiedRef = useRef(0);
  const composerRef = useRef<CommentComposer | null>(null);
  const syncRef = useRef<SyncState>({
    published: null,
    pending: [],
    log: emptyLog(PAGE_LOAD_SEQ),
  });
  const waitersRef = useRef(new Set<() => void>());
  const diskWriteRef = useRef<Promise<void>>(Promise.resolve());

  useLayoutEffect(() => {
    viewRef.current = reviewDoc;
    handleRef.current = handle;
    lastModifiedRef.current = lastModified;
    composerRef.current = composer;
    documentPathRef.current = documentPath;
    rememberedPathsRef.current = rememberedPaths;
  });

  const { fontSize, increaseFont, decreaseFont } = useFont({
    tool: "md-builder",
    defaultSize: MD_BUILDER_CONFIG.defaultFontSize,
    minSize: MD_BUILDER_CONFIG.minFontSize,
    maxSize: MD_BUILDER_CONFIG.maxFontSize,
  });

  const imageUrls = useMemo(() => {
    const urls = new Map<string, string>();
    if (!documentPath) return urls;
    for (const source of imageSources(reviewDoc.source)) {
      const path = resolveImageSource(documentPath, source);
      const url = path === null ? undefined : imageUrlsByPath[path];
      if (url) urls.set(source, url);
    }
    return urls;
  }, [documentPath, imageUrlsByPath, reviewDoc.source]);

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
      imageUrls
    );
  }, [reviewDoc.source, reviewDoc.comments, composer, imageUrls]);

  const newNoteKeys = useMemo(() => new Set(newNoteKeyList), [newNoteKeyList]);
  const sortedComments = useMemo(
    () => sortComments(reviewDoc.comments),
    [reviewDoc.comments]
  );
  const newThreadIds = useMemo(
    () =>
      sortedComments
        .filter((comment) =>
          comment.notes.some((_, index) =>
            newNoteKeys.has(noteKeyFor(reviewDoc.source, comment, index))
          )
        )
        .map((comment) => comment.id),
    [sortedComments, newNoteKeys, reviewDoc.source]
  );

  const resolvedThreads = useMemo(
    () =>
      resolvedList
        .filter((thread) => thread.documentName === reviewDoc.name)
        .sort((first, second) => second.resolvedAt - first.resolvedAt)
        .map((thread) => ({
          ...thread,
          canReopen: reopenRange(reviewDoc, thread.quote) !== null,
        })),
    [resolvedList, reviewDoc]
  );

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(
      () => setNotice(null),
      NOTICE_MS
    );
  }, []);

  const showDocument = useCallback(
    (next: ReviewDocument) => {
      viewRef.current = next;
      setReviewDoc(next);
    },
    [setReviewDoc]
  );

  const resetSync = useCallback(() => {
    const { log } = syncRef.current;
    syncRef.current = {
      published: null,
      pending: [],
      log: { ...emptyLog(log.firstSeq), seq: log.seq },
    };
    setIsDirty(false);
    setDroppedNotes([]);
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
    (loaded: LoadedFile, options: LoadOptions = { isRefresh: false }) => {
      const previous = viewRef.current;
      const next = documentFromMarkdown(
        loaded.text,
        loaded.name,
        options.isRefresh ? previous.nextId : 1
      );
      showDocument(next);
      setNewNoteKeyList((current) =>
        options.isRefresh ? [...new Set([...current, ...addedNoteKeys(previous, next)])] : NO_KEYS
      );
      resetSync();
      setHandle(loaded.handle);
      setLastModified(loaded.lastModified);
      setIsStale(false);
      setActiveCommentId(null);
      setComposer(null);
      setPendingSelection(null);
      setView("document");
      if (!options.isRefresh) setDocumentPath(null);
      if (loaded.handle) {
        setRememberedHandle(loaded.handle);
        rememberHandle(loaded.handle);
      }
    },
    [resetSync, setNewNoteKeyList, showDocument]
  );

  const openHandle = useCallback(
    async (nextHandle: FileSystemFileHandle, options?: LoadOptions) => {
      try {
        loadDocument(await readHandle(nextHandle), options);
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
    guardUnsaved(
      () => void openHandle(handle, { isRefresh: true }),
      MD_BUILDER_TEXT.refresh
    );
  }, [guardUnsaved, handle, openHandle]);

  const exportedMarkdown = useCallback(
    () => exportCriticMarkup(reviewDoc.source, reviewDoc.comments),
    [reviewDoc.source, reviewDoc.comments]
  );

  const publish = useCallback(() => {
    const sync = syncRef.current;
    if (!sync.pending.length) return;
    const published = sync.published ?? viewRef.current;
    const log = publishUserChanges(published, viewRef.current, sync.log, sync.pending);
    syncRef.current = { published: null, pending: [], log };
    if (isLiveRef.current) {
      const awaitingReply = log.events.filter(
        (event) =>
          event.seq > sync.log.seq &&
          event.actor === "user" &&
          event.threadId !== null &&
          (event.type === "comment" || event.type === "reply" || event.type === "edit-note")
      );
      if (awaitingReply.length) {
        setPendingReplySeqs((current) => {
          const next = { ...current };
          awaitingReply.forEach((event) => {
            next[event.threadId as number] = event.seq;
          });
          return next;
        });
      }
    }
    setIsDirty(false);
    waitersRef.current.forEach((wake) => wake());
  }, []);

  const writeTo = useCallback(
    async (target: FileSystemFileHandle) => {
      try {
        const modified = await writeHandle(target, exportedMarkdown());
        publish();
        setHandle(target);
        setLastModified(modified);
        setIsStale(false);
        setRememberedHandle(target);
        rememberHandle(target);
        if (viewRef.current.name !== target.name) {
          showDocument({ ...viewRef.current, name: target.name });
        }
        showNotice(MD_BUILDER_TEXT.saved);
      } catch {
        showNotice(MD_BUILDER_TEXT.saveError);
      }
    },
    [exportedMarkdown, publish, showDocument, showNotice]
  );

  const queueDiskWrite = useCallback(() => {
    const target = handleRef.current;
    if (!target) return;
    diskWriteRef.current = diskWriteRef.current
      .then(async () => {
        const onDisk = await lastModifiedOf(target);
        if (onDisk !== null && onDisk !== lastModifiedRef.current) {
          setIsStale(true);
          return;
        }
        const published = syncRef.current.published ?? viewRef.current;
        const modified = await writeHandle(
          target,
          exportCriticMarkup(published.source, published.comments)
        );
        lastModifiedRef.current = modified;
        setLastModified(modified);
      })
      .catch(() => showNotice(MD_BUILDER_TEXT.saveError));
  }, [showNotice]);

  const applyAgentChange = useCallback(
    (call: AgentCall): ClientMcpCallResult => {
      const sync = syncRef.current;
      const published = sync.published ?? viewRef.current;
      const outcome = applyAgentCall(published, sync.log, call, currentNoteTime());
      if (!outcome.ok) return { ok: false, error: outcome.message };

      let pending = sync.pending;
      const dropped: DroppedOp[] = [];
      if (outcome.change) {
        const mapped = mapPendingThroughChange(pending, outcome.change);
        pending = mapped.pending;
        dropped.push(...mapped.dropped);
      }
      const rebased = rebasePending(outcome.published, pending);
      dropped.push(...rebased.dropped);
      syncRef.current = {
        published: rebased.pending.length ? outcome.published : null,
        pending: rebased.pending,
        log: outcome.log,
      };
      showDocument(rebased.view);
      setIsDirty(rebased.pending.length > 0);
      if (dropped.length) setDroppedNotes((current) => [...current, ...dropped]);
      if (rebased.idRemap.size) {
        setActiveCommentId((current) =>
          current === null ? current : rebased.idRemap.get(current) ?? current
        );
      }

      const change = outcome.change;
      const openComposer = composerRef.current;
      if (change && openComposer) {
        const start = mapPosition(openComposer.range.start, change);
        const end = mapPosition(openComposer.range.end, change);
        if (start === null || end === null) {
          setComposer(null);
          showNotice(MD_BUILDER_TEXT.composerMoved);
        } else {
          setComposer({ ...openComposer, range: { start, end } });
        }
      }
      if (change) setPendingSelection(null);

      const thread =
        outcome.threadId === null
          ? undefined
          : outcome.published.comments.find((comment) => comment.id === outcome.threadId);
      if (thread) {
        setIncomingNote((current) => ({
          threadId: thread.id,
          tick: (current?.tick ?? 0) + 1,
        }));
      }
      if (thread && call.tool === "reply") {
        setPendingReplySeqs((current) => {
          if (!(thread.id in current)) return current;
          const next = { ...current };
          delete next[thread.id];
          return next;
        });
      }
      if (thread && (call.tool === "reply" || call.tool === "comment")) {
        const key = noteKeyFor(outcome.published.source, thread, thread.notes.length - 1);
        setNewNoteKeyList((current) => (current.includes(key) ? current : [...current, key]));
      }

      queueDiskWrite();
      return {
        ok: true,
        value: {
          applied: call.tool,
          seq: outcome.log.seq,
          threadId: outcome.threadId === null ? null : `t${outcome.threadId}`,
          ...(call.tool === "add_image" ? { markdown: call.markdown } : {}),
        },
      };
    },
    [queueDiskWrite, setNewNoteKeyList, showDocument, showNotice]
  );

  const waitForActivity = useCallback(
    async (args: Record<string, unknown>): Promise<ClientMcpCallResult> => {
      const sinceSeq =
        typeof args.sinceSeq === "number" ? args.sinceSeq : syncRef.current.log.seq;
      const timeoutMs = clampSeconds(args.timeoutSeconds) * 1000;
      if (sinceSeq < syncRef.current.log.firstSeq) {
        return {
          ok: true,
          value: {
            seq: syncRef.current.log.seq,
            reloaded: true,
            note: MD_BUILDER_TEXT.agentReloaded,
            events: [],
          },
        };
      }
      const eventsNow = () => userEventsSince(syncRef.current.log, sinceSeq);

      let timedOut = false;
      if (!eventsNow().length) {
        timedOut = await new Promise<boolean>((resolve) => {
          const timer = window.setTimeout(() => {
            waitersRef.current.delete(wake);
            resolve(true);
          }, timeoutMs);
          function wake() {
            window.clearTimeout(timer);
            waitersRef.current.delete(wake);
            resolve(false);
          }
          waitersRef.current.add(wake);
        });
      }
      return {
        ok: true,
        value: {
          seq: syncRef.current.log.seq,
          timedOut,
          events: eventsNow().map(eventForAgent),
        },
      };
    },
    []
  );

  const locateDocument = useCallback(
    async (agentHint?: string) => {
      const files = liveFilesRef.current;
      if (!files?.canReadFiles) return NOT_LOCATED;
      const published = syncRef.current.published ?? viewRef.current;
      const firstLine = firstLineOf(exportCriticMarkup(published.source, published.comments), Infinity);
      const key = documentKey(published.name, firstLine);
      const located = await files.locateDocument({
        name: published.name,
        firstLine,
        hint: agentHint ?? rememberedPathsRef.current[key],
      });
      const { path } = located;
      if (!path) return located;
      documentPathRef.current = path;
      setDocumentPath(path);
      if (agentHint) {
        setRememberedPaths((current) =>
          Object.fromEntries([...Object.entries(current).filter(([saved]) => saved !== key), [key, path]].slice(-MAX_REMEMBERED_PATHS))
        );
      }
      return located;
    },
    [setRememberedPaths]
  );

  const addImage = useCallback(
    async (args: Record<string, unknown>): Promise<ClientMcpCallResult> => {
      const request = imageRequestFrom(args);
      if (typeof request === "string") return { ok: false, error: request };
      const files = liveFilesRef.current;
      if (!files) return { ok: false, error: rejectionMessage("not_connected") };
      if (!files.canReadFiles) return { ok: false, error: rejectionMessage("bridge_outdated") };
      const hinted = request.documentPath ? await locateDocument(request.documentPath) : NOT_LOCATED;
      const searched = hinted.path || documentPathRef.current ? NOT_LOCATED : await locateDocument();
      const located = hinted.path ?? documentPathRef.current ?? searched.path;
      if (!located && searched.candidates.length > 1) {
        return {
          ok: false,
          error: `${rejectionMessage("document_ambiguous")} ${searched.candidates.join(", ")}`,
        };
      }
      if (!located) return { ok: false, error: rejectionMessage("document_not_found") };
      const image = await files.readImage(request.path, false);
      if (!image.ok) return { ok: false, error: rejectionMessage(image.reason) };
      const markdown = imageMarkdown(request.alt, relativeImagePath(located, image.path));
      return applyAgentChange({ tool: "add_image", after: request.after, markdown });
    },
    [applyAgentChange, locateDocument]
  );

  const respondToAgent = useCallback(
    async (tool: string, args: Record<string, unknown>): Promise<ClientMcpCallResult> => {
      if (!viewRef.current.source) return { ok: false, error: MD_BUILDER_TEXT.liveNoDocument };
      if (tool === LIVE_TOOL_NAMES.setStatus) {
        const text = typeof args.text === "string" ? args.text.trim() : "";
        const threadId =
          typeof args.threadId === "string" ? parseThreadKey(args.threadId) : null;
        setAgentStatus({
          isWorking: true,
          text: text.slice(0, AGENT_STATUS_MAX_LENGTH) || MD_BUILDER_TEXT.agentThinking,
          threadId,
        });
        return { ok: true, value: { shown: true } };
      }
      if (tool === LIVE_TOOL_NAMES.waitForActivity) {
        const sinceSeq =
          typeof args.sinceSeq === "number" ? args.sinceSeq : syncRef.current.log.seq;
        setPendingReplySeqs((current) => {
          const entries = Object.entries(current).filter(([, seq]) => seq > sinceSeq);
          return entries.length === Object.keys(current).length
            ? current
            : Object.fromEntries(entries);
        });
        setAgentStatus({ isWorking: false, text: MD_BUILDER_TEXT.agentWaiting, threadId: null });
        const result = await waitForActivity(args);
        const value = result.ok ? (result.value as { events?: unknown[] }) : null;
        if (value?.events?.length) {
          setAgentStatus({ isWorking: true, text: MD_BUILDER_TEXT.agentThinking, threadId: null });
        }
        return result;
      }
      setAgentStatus((current) =>
        current?.isWorking
          ? current
          : { isWorking: true, text: MD_BUILDER_TEXT.agentThinking, threadId: null }
      );
      if (tool === LIVE_TOOL_NAMES.getDocument) {
        const hint = typeof args.documentPath === "string" ? args.documentPath.trim() : "";
        if (hint) await locateDocument(hint);
        const sync = syncRef.current;
        return {
          ok: true,
          value: documentSnapshot(sync.published ?? viewRef.current, sync.log, documentPathRef.current),
        };
      }
      if (tool === LIVE_TOOL_NAMES.addImage) return addImage(args);
      const call = agentCallFrom(tool, args);
      if (typeof call === "string") return { ok: false, error: call };
      return applyAgentChange(call);
    },
    [addImage, applyAgentChange, locateDocument, waitForActivity]
  );

  const clearAgentAwayTimer = useCallback(() => {
    if (agentAwayTimerRef.current) window.clearTimeout(agentAwayTimerRef.current);
    agentAwayTimerRef.current = null;
  }, []);

  const handleAgentCall = useCallback(
    async (tool: string, args: Record<string, unknown>): Promise<ClientMcpCallResult> => {
      activeAgentCallsRef.current += 1;
      clearAgentAwayTimer();
      setIsAgentAway(false);
      try {
        return await respondToAgent(tool, args);
      } finally {
        activeAgentCallsRef.current -= 1;
        if (activeAgentCallsRef.current === 0) {
          agentAwayTimerRef.current = window.setTimeout(
            () => setIsAgentAway(true),
            MD_BUILDER_CONFIG.agentAwayMs
          );
        }
      }
    },
    [clearAgentAwayTimer, respondToAgent]
  );

  useEffect(() => clearAgentAwayTimer, [clearAgentAwayTimer]);

  const live = useLiveMode({
    hasDocument: reviewDoc.source.length > 0,
    onCall: handleAgentCall,
    onConnected: () => {
      clearAgentAwayTimer();
      setIsAgentAway(false);
      setAgentStatus(null);
      setPendingReplySeqs({});
      requestedImagesRef.current.clear();
      publish();
      queueDiskWrite();
    },
  });
  const isLive = live.state.connected !== null;
  const { locateDocument: locateWithBridge, readImage } = live;

  useLayoutEffect(() => {
    liveFilesRef.current = live.state.connected
      ? { canReadFiles: live.state.connected.canReadFiles, locateDocument: locateWithBridge, readImage }
      : null;
  });

  const hasDocument = reviewDoc.source.length > 0;
  useEffect(() => {
    if (isLive && hasDocument && documentPath === null) void locateDocument();
  }, [documentPath, hasDocument, isLive, locateDocument, reviewDoc.name]);

  useEffect(() => {
    if (!isLive || !documentPath) return;
    for (const source of imageSources(reviewDoc.source)) {
      const path = resolveImageSource(documentPath, source);
      if (path === null || requestedImagesRef.current.has(path)) continue;
      requestedImagesRef.current.add(path);
      void readImage(path, true).then((image) => {
        if (!image.ok || !image.data) return;
        const bytes = Uint8Array.from(atob(image.data), (character) => character.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: image.mime }));
        setImageUrlsByPath((current) => ({ ...current, [path]: url }));
      });
    }
  }, [documentPath, isLive, readImage, reviewDoc.source]);

  const imageUrlsRef = useRef(imageUrlsByPath);
  useLayoutEffect(() => {
    imageUrlsRef.current = imageUrlsByPath;
  });
  useEffect(
    () => () => Object.values(imageUrlsRef.current).forEach((url) => URL.revokeObjectURL(url)),
    []
  );

  useLayoutEffect(() => {
    isLiveRef.current = isLive;
  });

  const pendingAgentReplies = useMemo(() => {
    if (!isLive || agentStatus === null) return {};
    return Object.fromEntries(
      Object.keys(pendingReplySeqs).map((key) => {
        const threadId = Number(key);
        const text =
          agentStatus.isWorking && agentStatus.threadId === threadId
            ? agentStatus.text
            : MD_BUILDER_TEXT.agentThinking;
        return [threadId, text];
      })
    ) as Record<number, string>;
  }, [agentStatus, isLive, pendingReplySeqs]);

  const canSave =
    reviewDoc.source.length > 0 && (isDirty || (handle === null && !isLive));

  const save = useCallback(async () => {
    if (!canSave) return;
    if (isLive) publish();
    if (!hasFileSystemAccess) {
      if (!isLive) downloadMarkdown(exportedMarkdown(), reviewDoc.name);
      return;
    }
    if (!handle) {
      if (isLive) return;
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
    canSave,
    exportedMarkdown,
    handle,
    isLive,
    lastModified,
    publish,
    reviewDoc.name,
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
    setIsCopied(true);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(
      () => setIsCopied(false),
      MD_BUILDER_CONFIG.copiedFeedbackMs
    );
  }, [exportedMarkdown, reviewDoc.source]);

  async function copyAgentPrompt() {
    if (isLive) {
      await navigator.clipboard.writeText(MD_BUILDER_TEXT.livePrompt);
      showNotice(MD_BUILDER_TEXT.copiedLivePrompt);
      return;
    }
    await navigator.clipboard.writeText(agentBriefFor(reviewDoc.name, reviewDoc.source));
    showNotice(MD_BUILDER_TEXT.copiedAgentBrief);
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
      showDocument({ ...EMPTY_DOCUMENT });
      setNewNoteKeyList(NO_KEYS);
      resetSync();
      setHandle(null);
      setLastModified(0);
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

  function commitUserOp(op: UserOp) {
    const current = viewRef.current;
    const next = applyUserOp(current, op);
    if (!next) return false;
    const sync = syncRef.current;
    syncRef.current = {
      ...sync,
      published: sync.published ?? current,
      pending: [...sync.pending, op],
    };
    showDocument(next);
    setIsDirty(true);
    if (isLive) {
      publish();
      queueDiskWrite();
    }
    return true;
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

  useEffect(() => {
    if (!composer) return;
    function handleCancelShortcut(event: KeyboardEvent) {
      if (event.key !== CANCEL_SHORTCUT.key) return;
      event.preventDefault();
      setComposer(null);
    }
    window.addEventListener("keydown", handleCancelShortcut, true);
    return () => window.removeEventListener("keydown", handleCancelShortcut, true);
  }, [composer]);

  useEffect(() => {
    if (!pendingSelection || composer) return;
    function handleCommentShortcut(event: KeyboardEvent) {
      if (!isCommentShortcut(event)) return;
      event.preventDefault();
      beginComment();
    }
    window.addEventListener("keydown", handleCommentShortcut);
    return () => window.removeEventListener("keydown", handleCommentShortcut);
  });

  function cancelComment() {
    setComposer(null);
  }

  function submitComment(note: string) {
    const trimmed = note.trim();
    if (!composer || !trimmed) return;
    const id = viewRef.current.nextId;
    const isCommitted = commitUserOp({
      kind: "comment",
      id,
      start: composer.range.start,
      end: composer.range.end,
      note: withNoteTime(trimmed, currentNoteTime()),
    });
    if (!isCommitted) {
      showNotice(MD_BUILDER_TEXT.overlapError);
      return;
    }
    setComposer(null);
    clearSelection();
    setActiveCommentId(id);
  }

  function addReply(commentId: number, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;
    commitUserOp({ kind: "reply", threadId: commentId, note: withNoteTime(trimmed, currentNoteTime()) });
    setActiveCommentId(commentId);
  }

  function editNote(commentId: number, noteIndex: number, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;
    commitUserOp({
      kind: "edit-note",
      threadId: commentId,
      noteIndex,
      note: withNoteTime(trimmed, currentNoteTime()),
    });
  }

  function deleteNote(commentId: number, noteIndex: number) {
    commitUserOp({ kind: "delete-note", threadId: commentId, noteIndex });
    setActiveCommentId((current) => (current === commentId ? null : current));
  }

  function markNoteRead(commentId: number, noteIndex: number) {
    const comment = viewRef.current.comments.find((candidate) => candidate.id === commentId);
    if (!comment) return;
    const key = noteKeyFor(viewRef.current.source, comment, noteIndex);
    setNewNoteKeyList((current) => current.filter((saved) => saved !== key));
  }

  function resolveThread(commentId: number) {
    const thread = viewRef.current.comments.find((comment) => comment.id === commentId);
    if (!thread) return;
    const record: ResolvedThread = {
      key: `${Date.now()}-${commentId}`,
      documentName: viewRef.current.name,
      quote: viewRef.current.source.slice(thread.start, thread.end),
      notes: thread.notes,
      resolvedAt: Date.now(),
    };
    if (!commitUserOp({ kind: "resolve", threadId: commentId })) return;
    setPendingReplySeqs((current) => {
      if (!(commentId in current)) return current;
      const next = { ...current };
      delete next[commentId];
      return next;
    });
    setResolvedList((current) => [...current, record].slice(-MAX_RESOLVED));
    setActiveCommentId((current) => (current === commentId ? null : current));
    showNotice(MD_BUILDER_TEXT.resolvedNotice);
  }

  function reopenThread(key: string) {
    const record = resolvedList.find((thread) => thread.key === key);
    if (!record) return;
    const range = reopenRange(viewRef.current, record.quote);
    if (!range) {
      showNotice(MD_BUILDER_TEXT.reopenUnavailable);
      return;
    }
    const id = viewRef.current.nextId;
    if (!commitUserOp({ kind: "restore", id, ...range, notes: record.notes })) {
      showNotice(MD_BUILDER_TEXT.reopenUnavailable);
      return;
    }
    setResolvedList((current) => current.filter((thread) => thread.key !== key));
    setSidebarTab("comments");
    showNotice(MD_BUILDER_TEXT.reopenedNotice);
    focusComment(id);
  }

  function dismissDroppedNote(index: number) {
    setDroppedNotes((current) => current.filter((_, position) => position !== index));
  }

  async function copyDroppedNote(index: number) {
    const dropped = droppedNotes[index];
    if (dropped?.text) await navigator.clipboard.writeText(dropped.text);
  }

  function focusComment(commentId: number | null) {
    setActiveCommentId(commentId);
    if (commentId === null) return;
    setIsCommentsCollapsed(false);
    setFocusTick((tick) => tick + 1);
  }

  function focusNextNew() {
    if (!newThreadIds.length) return;
    const currentIndex = activeCommentId === null ? -1 : newThreadIds.indexOf(activeCommentId);
    focusComment(newThreadIds[(currentIndex + 1) % newThreadIds.length]);
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
    comments: sortedComments,
    html,
    hasDocument: reviewDoc.source.length > 0,
    hasHandle: handle !== null,
    canSave,
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
    isCopied,
    fontSize,
    isCommentsCollapsed,
    hoveredCommentId,
    focusTick,
    newNoteKeys,
    newThreadIds,
    droppedNotes,
    sidebarTab,
    resolvedThreads,
    incomingNote,
    agentStatus: isLive ? agentStatus : null,
    isAgentAway: isLive && isAgentAway,
    pendingAgentReplies,
    documentPath,
  };

  return {
    state,
    live,
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
    copyAgentPrompt,
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
    markNoteRead,
    resolveThread,
    reopenThread,
    setSidebarTab,
    dismissDroppedNote,
    copyDroppedNote,
    focusComment,
    focusNextNew,
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
