import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from "react";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  FolderOpen,
  MessageSquarePlus,
  Pencil,
  Radio,
  RefreshCw,
  Reply,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { FontSizeButtons } from "@/components/font-size-buttons";
import { Kbd } from "@/components/kbd";
import { ToolInfo } from "@/components/tool-info";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ClientMcpSession } from "@/lib/client-mcp";
import { cn, MOD_KEY_LABEL } from "@/lib/utils";
import {
  ACCEPTED_MARKDOWN_EXTENSIONS,
  COMMENT_MOTION,
  COMMENT_SCROLL_DELAY_MS,
  CANCEL_SHORTCUT,
  COMMENT_SHORTCUT,
  LIVE_SETUP_COMMANDS,
  PENDING_REPLY_DELAY_S,
  MD_BUILDER_CONFIG,
  MD_BUILDER_TEXT,
} from "@/tools/md-builder/lib/constants";
import type { ReviewComment } from "@/tools/md-builder/lib/critic-markup";
import { excerptOf } from "@/tools/md-builder/lib/critic-markup";
import type { DroppedOp } from "@/tools/md-builder/lib/live-sync";
import {
  AGENT_PREFIX,
  noteKeyFor,
  splitNoteTime,
} from "@/tools/md-builder/lib/live-sync";
import {
  COMMENT_ID_ATTR,
  PENDING_COMMENT_ID,
  renderMarkdown,
} from "@/tools/md-builder/lib/render-markdown";
import type { LiveModeState } from "@/tools/md-builder/lib/use-live-mode";
import type {
  CommentComposer,
  IncomingNote,
  ResolvedThreadView,
  SelectionAnchor,
  SidebarTab,
} from "@/tools/md-builder/lib/use-md-builder";
import { useMdBuilderWithCommands as useMdBuilder } from "@/tools/md-builder/lib/use-md-builder-commands";
import {
  formatNoteTime,
  isSubmitShortcut,
  orderSessions,
  scrollToCenter,
  sessionHostLabel,
  timeSince,
} from "@/tools/md-builder/lib/utils";

const ACTIVE_CLASS = "md-active";
const HOVERED_CLASS = "md-hovered";
const BLINK_CLASS = "md-blink";

export function MdBuilderTool() {
  const {
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
    dismissDroppedNote,
    copyDroppedNote,
    focusComment,
    focusNextNew,
    resolveThread,
    reopenThread,
    setSidebarTab,
    hoverComment,
    toggleCommentsCollapsed,
    documentScrollTopRef,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    increaseFont,
    decreaseFont,
  } = useMdBuilder();

  const hasAgentStarted = state.agentStatus !== null && !state.isAgentAway;

  const saveLabel =
    state.hasHandle || !state.hasFileSystemAccess
      ? MD_BUILDER_TEXT.save
      : MD_BUILDER_TEXT.saveAs;

  return (
    <div
      className="relative flex h-full w-full flex-col gap-0 overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        data-overflow-tooltip
        className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-1"
      >
        <ToolInfo
          name="md builder"
          description="review a markdown file with comments an agent can read."
          triggerText="help"
          detailed="open a local .md file, select text and leave comments. save writes them into the file as criticmarkup ({==text==}{>>comment<<}), so you can hand the same file to an agent, let it reply or apply the comments, then hit refresh to read its changes back; new notes stay highlighted until the next refresh. or click live to connect your agent, so it reads the document and answers each comment as soon as you post it. nothing leaves your machine."
        />

        {state.hasDocument && (
          <span className="flex min-w-0 items-center gap-1 font-mono text-10 text-muted-foreground">
            <span className="truncate">{state.name}</span>
            {state.isDirty && (
              <span className="shrink-0 text-primary">
                ● {MD_BUILDER_TEXT.unsaved}
              </span>
            )}
          </span>
        )}

        {state.agentStatus && hasAgentStarted ? (
          <span
            aria-live="polite"
            className={cn(
              "flex min-w-0 shrink items-center gap-1 font-mono text-10",
              state.agentStatus.isWorking ? "md-agent-hue" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                state.agentStatus.isWorking ? "animate-pulse bg-current" : "bg-muted-foreground/60"
              )}
            />
            <span className="truncate">
              {live.state.connected?.agentName ?? MD_BUILDER_TEXT.liveUnknownAgent}
              {" · "}
              {state.agentStatus.text}
            </span>
          </span>
        ) : (
          live.state.connected &&
          !hasAgentStarted && (
            <span
              aria-live="polite"
              className="flex min-w-0 shrink items-center gap-1 font-mono text-10 text-muted-foreground"
            >
              <LiveDot isActive={false} />
              <span className="md-breathing truncate text-orange-500 dark:text-orange-400">
                {live.state.connected.agentName ?? MD_BUILDER_TEXT.liveUnknownAgent}
                {" · "}
                {state.isAgentAway ? MD_BUILDER_TEXT.liveHeaderAway : MD_BUILDER_TEXT.liveHeaderWaiting}
              </span>
            </span>
          )
        )}

        {state.notice && (
          <span
            role="status"
            className="truncate font-mono text-10 text-muted-foreground"
          >
            {state.notice}
          </span>
        )}

        <span className="ml-auto flex min-w-0 items-center gap-1">
          {state.hasDocument && state.isStale && (
            <Button
              type="button"
              variant="primary-outline"
              size="xs"
              onClick={refresh}
              className="min-w-0 shrink animate-attention-surface"
            >
              <RefreshCw />
              <span className="truncate">{MD_BUILDER_TEXT.changedOnDisk}</span>
            </Button>
          )}
          {state.hasDocument && (
            <LivePanel
              state={live.state}
              hasAgentStarted={hasAgentStarted}
              isAgentAway={state.isAgentAway}
              onOpenChange={live.setIsPanelOpen}
              onConnect={live.connect}
              onDisconnect={live.disconnect}
            />
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={state.isDirty ? "primary-outline" : "outline"}
                  size="xs"
                  disabled={!state.canSave}
                  onClick={() => void save()}
                  className="min-w-0 shrink"
                />
              }
            >
              <Save />
              <span className="truncate">{saveLabel}</span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {MD_BUILDER_TEXT.saveHint} ({MOD_KEY_LABEL}S)
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!state.hasDocument}
            onClick={() => void copyMarkdown()}
            className={cn(
              "min-w-0 shrink",
              state.isCopied && "text-green-500 hover:text-green-500"
            )}
          >
            <Copy />
            <span className="truncate">{MD_BUILDER_TEXT.copy}</span>
            {state.isCopied && <Check />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={uploadFile}
            className="min-w-0 shrink"
          >
            <Upload />
            <span className="truncate">{MD_BUILDER_TEXT.upload}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  aria-label="more actions"
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {state.hasHandle && (
                <>
                  <DropdownMenuItem onClick={refresh}>
                    <RefreshCw />
                    {MD_BUILDER_TEXT.refresh}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={openFile}>
                <FolderOpen />
                {MD_BUILDER_TEXT.open}
              </DropdownMenuItem>
              {state.rememberedName && (
                <DropdownMenuItem onClick={reopenRemembered} className="flex-wrap">
                  {MD_BUILDER_TEXT.reopen} <FileName name={state.rememberedName} />
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={showPasteView}>
                {MD_BUILDER_TEXT.paste}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {state.hasFileSystemAccess && (
                <DropdownMenuItem
                  disabled={!state.hasDocument}
                  onClick={download}
                >
                  {MD_BUILDER_TEXT.download}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => void copyAgentPrompt()}>
                {live.state.connected
                  ? MD_BUILDER_TEXT.copyLivePrompt
                  : MD_BUILDER_TEXT.copyAgentBrief}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!state.hasDocument}
                variant="destructive"
                onClick={closeDocument}
              >
                {MD_BUILDER_TEXT.close}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FontSizeButtons onIncrease={increaseFont} onDecrease={decreaseFont} />
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MARKDOWN_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
      />

      {state.droppedNotes.length > 0 && (
        <DroppedNotes
          notes={state.droppedNotes}
          onCopy={(index) => void copyDroppedNote(index)}
          onDismiss={dismissDroppedNote}
        />
      )}

      <div className="relative min-h-0 flex-1">
        {state.view === "paste" ? (
          <PasteView onLoad={loadPastedText} onCancel={cancelPaste} />
        ) : state.hasDocument ? (
          state.isCommentsCollapsed ? (
            <div className="flex h-full w-full">
              <div className="min-w-0 flex-1">
                <DocumentPane
                  documentRef={documentRef}
                  html={state.html}
                  fontSize={state.fontSize}
                  activeCommentId={state.activeCommentId}
                  selectionAnchor={state.pendingSelection?.anchor ?? null}
                  composer={state.composer}
                  hoveredCommentId={state.hoveredCommentId}
                  focusTick={state.focusTick}
                  scrollTopRef={documentScrollTopRef}
                  hideScrollbar
                  onFocusComment={focusComment}
                  onHoverComment={hoverComment}
                  onBeginComment={beginComment}
                  onSubmitComment={submitComment}
                  onCancelComment={cancelComment}
                />
              </div>
              <CommentMinimap
                documentRef={documentRef}
                html={state.html}
                fontSize={state.fontSize}
                comments={state.comments}
                activeCommentId={state.activeCommentId}
                newThreadIds={state.newThreadIds}
                onFocusComment={focusComment}
                onExpand={toggleCommentsCollapsed}
              />
            </div>
          ) : (
            <ResizablePanelGroup
              direction="horizontal"
              className="h-full w-full"
            >
              <ResizablePanel defaultSize="66%" minSize="30%">
                <DocumentPane
                  documentRef={documentRef}
                  html={state.html}
                  fontSize={state.fontSize}
                  activeCommentId={state.activeCommentId}
                  selectionAnchor={state.pendingSelection?.anchor ?? null}
                  composer={state.composer}
                  hoveredCommentId={state.hoveredCommentId}
                  focusTick={state.focusTick}
                  scrollTopRef={documentScrollTopRef}
                  onFocusComment={focusComment}
                  onHoverComment={hoverComment}
                  onBeginComment={beginComment}
                  onSubmitComment={submitComment}
                  onCancelComment={cancelComment}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize="34%" minSize="18%">
                <CommentsPane
                  source={state.source}
                  comments={state.comments}
                  activeCommentId={state.activeCommentId}
                  newNoteKeys={state.newNoteKeys}
                  newThreadCount={state.newThreadIds.length}
                  hoveredCommentId={state.hoveredCommentId}
                  pendingAgentReplies={state.pendingAgentReplies}
                  tab={state.sidebarTab}
                  resolvedThreads={state.resolvedThreads}
                  incomingNote={state.incomingNote}
                  onTabChange={setSidebarTab}
                  onResolve={resolveThread}
                  onReopen={reopenThread}
                  onNextNew={focusNextNew}
                  onFocusComment={focusComment}
                  onHoverComment={hoverComment}
                  onReply={addReply}
                  onEdit={editNote}
                  onDelete={deleteNote}
                  onCollapse={toggleCommentsCollapsed}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          )
        ) : (
          <EmptyState
            isReady={state.isReady}
            rememberedName={state.rememberedName}
            onOpen={openFile}
            onUpload={uploadFile}
            onReopen={reopenRemembered}
            onPaste={showPasteView}
          />
        )}

        {state.isDragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-primary bg-primary/10 font-mono text-xs text-primary">
            {MD_BUILDER_TEXT.dropHint}
          </div>
        )}
      </div>

      <AlertDialog
        open={state.confirmation !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) cancelConfirmation();
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogDescription className="text-xs">
            {state.confirmation?.message}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel size="xs">
              {MD_BUILDER_TEXT.cancel}
            </AlertDialogCancel>
            <AlertDialogAction size="xs" onClick={confirmPending}>
              {state.confirmation?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface DocumentPaneProps {
  documentRef: React.RefObject<HTMLDivElement | null>;
  html: string;
  fontSize: number;
  activeCommentId: number | null;
  selectionAnchor: SelectionAnchor | null;
  composer: CommentComposer | null;
  hoveredCommentId: number | null;
  focusTick: number;
  scrollTopRef: RefObject<number>;
  hideScrollbar?: boolean;
  onFocusComment: (id: number | null) => void;
  onHoverComment: (id: number | null) => void;
  onBeginComment: () => void;
  onSubmitComment: (note: string) => void;
  onCancelComment: () => void;
}

function marksFor(container: HTMLElement, commentId: number | null) {
  if (commentId === null) return [];
  return [
    ...container.querySelectorAll<HTMLElement>(
      `[${COMMENT_ID_ATTR}="${commentId}"]`
    ),
  ];
}

function DocumentPane({
  documentRef,
  html,
  fontSize,
  activeCommentId,
  selectionAnchor,
  composer,
  hoveredCommentId,
  focusTick,
  scrollTopRef,
  hideScrollbar = false,
  onFocusComment,
  onHoverComment,
  onBeginComment,
  onSubmitComment,
  onCancelComment,
}: DocumentPaneProps) {
  const markup = useMemo(() => ({ __html: html }), [html]);

  useLayoutEffect(() => {
    const container = documentRef.current;
    if (!container) return;
    const restore = () => {
      container.scrollTop = scrollTopRef.current;
    };
    restore();
    const frame = window.requestAnimationFrame(restore);
    return () => window.cancelAnimationFrame(frame);
  }, [documentRef, scrollTopRef]);

  useEffect(() => {
    const container = documentRef.current;
    if (!container) return;
    container
      .querySelectorAll(`.${ACTIVE_CLASS}, .${HOVERED_CLASS}`)
      .forEach((element) =>
        element.classList.remove(ACTIVE_CLASS, HOVERED_CLASS)
      );
    marksFor(container, activeCommentId).forEach((element) =>
      element.classList.add(ACTIVE_CLASS)
    );
    marksFor(container, hoveredCommentId).forEach((element) =>
      element.classList.add(HOVERED_CLASS)
    );
  }, [documentRef, html, activeCommentId, hoveredCommentId]);

  useEffect(() => {
    const container = documentRef.current;
    if (!container || focusTick === 0) return;
    const marks = marksFor(container, activeCommentId);
    if (!marks.length) return;
    let blinkTimer = 0;
    const cancelScroll = scrollToCenter(
      container,
      marks[0],
      MD_BUILDER_CONFIG.focusScrollMs,
      () => {
        marks.forEach((element) => element.classList.add(BLINK_CLASS));
        blinkTimer = window.setTimeout(
          () =>
            marks.forEach((element) => element.classList.remove(BLINK_CLASS)),
          MD_BUILDER_CONFIG.blinkMs
        );
      }
    );
    return () => {
      cancelScroll();
      if (blinkTimer) window.clearTimeout(blinkTimer);
      marks.forEach((element) => element.classList.remove(BLINK_CLASS));
    };
  }, [documentRef, focusTick, activeCommentId]);

  function handleMouseOver(event: MouseEvent<HTMLDivElement>) {
    const mark = (event.target as HTMLElement).closest(`[${COMMENT_ID_ATTR}]`);
    const commentId = mark ? Number(mark.getAttribute(COMMENT_ID_ATTR)) : null;
    const nextId = commentId === PENDING_COMMENT_ID ? null : commentId;
    if (nextId !== hoveredCommentId) onHoverComment(nextId);
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const mark = (event.target as HTMLElement).closest(`[${COMMENT_ID_ATTR}]`);
    if (!mark || !window.getSelection()?.isCollapsed) return;
    const commentId = Number(mark.getAttribute(COMMENT_ID_ATTR));
    if (commentId === PENDING_COMMENT_ID) return;
    onFocusComment(commentId);
  }

  return (
    <div
      ref={documentRef}
      className={cn(
        "relative h-full w-full overflow-y-auto [contain:inline-size]",
        hideScrollbar && "[scrollbar-width:none]"
      )}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseLeave={() => onHoverComment(null)}
    >
      <article
        className="md-doc px-4 py-3"
        style={{ fontSize }}
        dangerouslySetInnerHTML={markup}
      />

      {selectionAnchor && !composer && (
        <Button
          type="button"
          size="xs"
          className="absolute z-10 -translate-x-1/2 shadow-md"
          style={{
            top: selectionAnchor.top + selectionAnchor.height + 6,
            left: Math.max(
              48,
              selectionAnchor.left + selectionAnchor.width / 2
            ),
          }}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onBeginComment}
        >
          <MessageSquarePlus />
          {MD_BUILDER_TEXT.comment}
          <Kbd keys={[MOD_KEY_LABEL, COMMENT_SHORTCUT.label]} />
        </Button>
      )}

      {composer && (
        <ComposerPopover
          composer={composer}
          onSubmit={onSubmitComment}
          onCancel={onCancelComment}
        />
      )}
    </div>
  );
}

interface ComposerPopoverProps {
  composer: CommentComposer;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}

function ComposerPopover({ composer, onSubmit, onCancel }: ComposerPopoverProps) {
  const [note, setNote] = useState("");
  const quote = composer.quote.replace(/\s+/g, " ").slice(0, 200);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isSubmitShortcut(event)) onSubmit(note);
  }

  return (
    <div
      className="absolute z-10 flex w-72 max-w-[calc(100%-1rem)] flex-col gap-1 border border-border bg-popover p-2 shadow-lg"
      style={{
        top: composer.anchor.top + composer.anchor.height + 6,
        left: Math.max(8, composer.anchor.left),
      }}
    >
      <Quote>{quote}</Quote>
      <Textarea
        autoFocus
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={MD_BUILDER_TEXT.commentPlaceholder}
        className="min-h-14 border-border"
      />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="outline" size="xs" onClick={onCancel}>
          {MD_BUILDER_TEXT.cancel}
          <Kbd keys={[CANCEL_SHORTCUT.label]} />
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={!note.trim()}
          onClick={() => onSubmit(note)}
        >
          {MD_BUILDER_TEXT.comment}
          <Kbd keys={[MOD_KEY_LABEL, COMMENT_SHORTCUT.label]} />
        </Button>
      </div>
    </div>
  );
}

interface CommentsPaneProps {
  source: string;
  comments: ReviewComment[];
  activeCommentId: number | null;
  newNoteKeys: ReadonlySet<string>;
  newThreadCount: number;
  hoveredCommentId: number | null;
  pendingAgentReplies: Record<number, string>;
  tab: SidebarTab;
  resolvedThreads: ResolvedThreadView[];
  incomingNote: IncomingNote | null;
  onTabChange: (tab: SidebarTab) => void;
  onResolve: (id: number) => void;
  onReopen: (key: string) => void;
  onNextNew: () => void;
  onFocusComment: (id: number | null) => void;
  onHoverComment: (id: number | null) => void;
  onReply: (id: number, note: string) => void;
  onEdit: (id: number, noteIndex: number, note: string) => void;
  onDelete: (id: number, noteIndex: number) => void;
  onCollapse: () => void;
}

function scrollCardIntoView(list: HTMLElement | null, commentId: number) {
  list
    ?.querySelector(`[${COMMENT_ID_ATTR}="${commentId}"]`)
    ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function CommentsPane({
  source,
  comments,
  activeCommentId,
  newNoteKeys,
  newThreadCount,
  hoveredCommentId,
  pendingAgentReplies,
  tab,
  resolvedThreads,
  incomingNote,
  onTabChange,
  onResolve,
  onReopen,
  onNextNew,
  onFocusComment,
  onHoverComment,
  onReply,
  onEdit,
  onDelete,
  onCollapse,
}: CommentsPaneProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCommentId === null || tab !== "comments") return;
    const timer = window.setTimeout(
      () => scrollCardIntoView(listRef.current, activeCommentId),
      COMMENT_SCROLL_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [activeCommentId, tab]);

  useEffect(() => {
    if (!incomingNote || tab !== "comments") return;
    const timer = window.setTimeout(
      () => scrollCardIntoView(listRef.current, incomingNote.threadId),
      COMMENT_SCROLL_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [incomingNote, tab]);

  return (
    <div className="flex h-full w-full flex-col border-l border-border">
      <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border px-1">
        <div role="tablist" className="flex">
          <SidebarTabButton
            isActive={tab === "comments"}
            onSelect={() => onTabChange("comments")}
          >
            {MD_BUILDER_TEXT.commentsTitle}
            {comments.length > 0 && ` (${comments.length})`}
          </SidebarTabButton>
          <SidebarTabButton
            isActive={tab === "resolved"}
            onSelect={() => onTabChange("resolved")}
          >
            {MD_BUILDER_TEXT.resolvedTitle}
            {resolvedThreads.length > 0 && ` (${resolvedThreads.length})`}
          </SidebarTabButton>
        </div>
        {tab === "comments" && newThreadCount > 0 && (
          <Button
            type="button"
            variant="primary-outline"
            size="xs"
            onClick={onNextNew}
            aria-label={MD_BUILDER_TEXT.nextNew}
            title={MD_BUILDER_TEXT.nextNew}
          >
            {newThreadCount} {MD_BUILDER_TEXT.newNotes}
            <ChevronRight />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-auto"
          onClick={onCollapse}
          aria-label={MD_BUILDER_TEXT.collapseComments}
        >
          <ChevronRight />
        </Button>
      </div>
      <div ref={listRef} role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-1">
        {tab === "resolved" ? (
          <ResolvedList threads={resolvedThreads} onReopen={onReopen} />
        ) : comments.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            {MD_BUILDER_TEXT.noComments}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((comment) => (
              <motion.div key={comment.id} {...COMMENT_MOTION}>
                <div className="pb-2">
                  <CommentCard
                    comment={comment}
                    excerpt={excerptOf(
                      source,
                      comment,
                      MD_BUILDER_CONFIG.excerptLength
                    )}
                    isActive={comment.id === activeCommentId}
                    isHovered={comment.id === hoveredCommentId}
                    pendingAgentText={pendingAgentReplies[comment.id] ?? null}
                    hasNewElsewhere={newThreadCount > 0}
                    newNoteIndexes={comment.notes.flatMap((_, index) =>
                      newNoteKeys.has(noteKeyFor(source, comment, index)) ? [index] : []
                    )}
                    onFocus={() => onFocusComment(comment.id)}
                    onHover={(isHovering) =>
                      onHoverComment(isHovering ? comment.id : null)
                    }
                    onResolve={() => onResolve(comment.id)}
                    onReply={(note) => onReply(comment.id, note)}
                    onEdit={(noteIndex, note) => onEdit(comment.id, noteIndex, note)}
                    onDelete={(noteIndex) => onDelete(comment.id, noteIndex)}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

interface SidebarTabButtonProps {
  isActive: boolean;
  onSelect: () => void;
  children: ReactNode;
}

function SidebarTabButton({ isActive, onSelect, children }: SidebarTabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onSelect}
      className={cn(
        "cursor-pointer p-1 font-mono text-10 transition-colors",
        isActive
          ? "bg-accent/50 text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

interface ResolvedListProps {
  threads: ResolvedThreadView[];
  onReopen: (key: string) => void;
}

function ResolvedList({ threads, onReopen }: ResolvedListProps) {
  if (!threads.length) {
    return <p className="p-2 text-xs text-muted-foreground">{MD_BUILDER_TEXT.noResolved}</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      {threads.map((thread) => (
        <ResolvedCard key={thread.key} thread={thread} onReopen={() => onReopen(thread.key)} />
      ))}
    </div>
  );
}

interface ResolvedCardProps {
  thread: ResolvedThreadView;
  onReopen: () => void;
}

function ResolvedCard({ thread, onReopen }: ResolvedCardProps) {
  const quote = thread.quote.replace(/\s+/g, " ").slice(0, MD_BUILDER_CONFIG.excerptLength);

  return (
    <div className="flex flex-col gap-1 border border-border bg-background p-2">
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">{quote && <Quote>{quote}</Quote>}</div>
        <span title={thread.canReopen ? undefined : MD_BUILDER_TEXT.reopenUnavailable}>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!thread.canReopen}
            onClick={onReopen}
          >
            {MD_BUILDER_TEXT.reopenThread}
          </Button>
        </span>
      </div>
      {thread.notes.map((note, index) => (
        <div key={index} className="flex gap-1.5">
          {index > 0 && <ReplyMarker />}
          <NoteMarkdown
            text={splitNoteTime(note).text}
            className="min-w-0 flex-1 text-muted-foreground"
          />
        </div>
      ))}
      <span className="font-mono text-10 text-muted-foreground/70">
        {MD_BUILDER_TEXT.resolvedTitle}{" "}
        {new Date(thread.resolvedAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </span>
    </div>
  );
}

interface CommentMarker {
  id: number;
  ratio: number;
}

interface CommentMinimapProps {
  documentRef: React.RefObject<HTMLDivElement | null>;
  html: string;
  fontSize: number;
  comments: ReviewComment[];
  activeCommentId: number | null;
  newThreadIds: number[];
  onFocusComment: (id: number | null) => void;
  onExpand: () => void;
}

interface MinimapViewport {
  top: number;
  height: number;
}

function CommentMinimap({
  documentRef,
  html,
  fontSize,
  comments,
  activeCommentId,
  newThreadIds,
  onFocusComment,
  onExpand,
}: CommentMinimapProps) {
  const [markers, setMarkers] = useState<CommentMarker[]>([]);
  const [viewport, setViewport] = useState<MinimapViewport>({
    top: 0,
    height: 1,
  });
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = documentRef.current;
    if (!container) return;

    function measure() {
      const scrollHeight = container!.scrollHeight || 1;
      const containerTop = container!.getBoundingClientRect().top;
      setViewport({
        top: container!.scrollTop / scrollHeight,
        height: Math.min(1, container!.clientHeight / scrollHeight),
      });
      setMarkers(
        comments.flatMap((comment) => {
          const mark = container!.querySelector(
            `[${COMMENT_ID_ATTR}="${comment.id}"]`
          );
          if (!mark) return [];
          const top =
            mark.getBoundingClientRect().top -
            containerTop +
            container!.scrollTop;
          return [{ id: comment.id, ratio: top / scrollHeight }];
        })
      );
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", measure);
    };
  }, [documentRef, html, fontSize, comments]);

  function scrollRatio(ratio: number) {
    const container = documentRef.current;
    if (!container) return;
    const centered = ratio * container.scrollHeight - container.clientHeight / 2;
    container.scrollTop = Math.max(0, centered);
  }

  function handleTrackClick(event: MouseEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track || event.target !== track) return;
    const { top, height } = track.getBoundingClientRect();
    scrollRatio((event.clientY - top) / height);
  }

  function handleThumbPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const container = documentRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    event.preventDefault();
    const startY = event.clientY;
    const startScrollTop = container.scrollTop;
    const scale = container.scrollHeight / track.getBoundingClientRect().height;

    function handleMove(moveEvent: PointerEvent) {
      container!.scrollTop = startScrollTop + (moveEvent.clientY - startY) * scale;
    }
    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function handleMarkerClick(commentId: number) {
    onFocusComment(commentId);
  }

  return (
    <div className="flex w-4 shrink-0 flex-col border-l border-border">
      <button
        type="button"
        onClick={onExpand}
        aria-label={MD_BUILDER_TEXT.expandComments}
        className="flex h-7 shrink-0 cursor-pointer items-center justify-center border-b border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="size-3" />
      </button>
      <div
        ref={trackRef}
        className="relative min-h-0 flex-1"
        onClick={handleTrackClick}
      >
        <div
          onPointerDown={handleThumbPointerDown}
          style={{
            top: `${viewport.top * 100}%`,
            height: `${viewport.height * 100}%`,
          }}
          className="absolute left-0 w-full cursor-grab bg-foreground/15 hover:bg-foreground/25 active:cursor-grabbing"
        />
        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            onClick={() => handleMarkerClick(marker.id)}
            aria-label={`${MD_BUILDER_TEXT.comment} ${marker.id}`}
            style={{ top: `${marker.ratio * 100}%` }}
            className="group/marker absolute left-0 flex h-3 w-full -translate-y-1/2 cursor-pointer items-center"
          >
            <span
              className={cn(
                "h-0.5 w-full transition-[height,background-color]",
                "bg-primary/80 group-hover/marker:bg-primary",
                newThreadIds.includes(marker.id) && "h-1 bg-foreground",
                marker.id === activeCommentId && "h-1 bg-primary"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface CommentCardProps {
  comment: ReviewComment;
  excerpt: string;
  isActive: boolean;
  isHovered: boolean;
  pendingAgentText: string | null;
  hasNewElsewhere: boolean;
  newNoteIndexes: number[];
  onFocus: () => void;
  onHover: (isHovering: boolean) => void;
  onResolve: () => void;
  onReply: (note: string) => void;
  onEdit: (noteIndex: number, note: string) => void;
  onDelete: (noteIndex: number) => void;
}

function CommentCard({
  comment,
  excerpt,
  isActive,
  isHovered,
  pendingAgentText,
  hasNewElsewhere,
  newNoteIndexes,
  onFocus,
  onHover,
  onResolve,
  onReply,
  onEdit,
  onDelete,
}: CommentCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, textarea")) return;
    onFocus();
  }

  return (
    <div
      {...{ [COMMENT_ID_ATTR]: comment.id }}
      className={cn(
        "group/card flex flex-col gap-3 border border-border bg-secondary/15 p-2 transition-colors hover:bg-secondary/25",
        isHovered && "bg-secondary/25",
        isActive && "border-primary"
      )}
      onClick={handleCardClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          {comment.end > comment.start && <Quote>{excerpt}</Quote>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-primary"
          onClick={onResolve}
          aria-label={MD_BUILDER_TEXT.resolveThread}
          title={MD_BUILDER_TEXT.resolveThread}
        >
          <Check />
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {comment.notes.map((note, index) => (
          <motion.div key={index} {...COMMENT_MOTION}>
            <AutoHeight>
              {editingIndex === index ? (
                <NoteForm
                  initialValue={splitNoteTime(note).text}
                  placeholder={MD_BUILDER_TEXT.commentPlaceholder}
                  submitLabel={MD_BUILDER_TEXT.save}
                  onSubmit={(value) => {
                    onEdit(index, value);
                    setEditingIndex(null);
                  }}
                  onCancel={() => setEditingIndex(null)}
                />
              ) : (
                <NoteView
                  note={note}
                  isNew={newNoteIndexes.includes(index)}
                  isDimmed={hasNewElsewhere && !newNoteIndexes.includes(index)}
                  isReply={index > 0}
                  onEdit={() => setEditingIndex(index)}
                  onDelete={() => onDelete(index)}
                />
              )}
            </AutoHeight>
          </motion.div>
        ))}
        {pendingAgentText !== null && (
          <motion.div
            key={comment.notes.length}
            {...COMMENT_MOTION}
            transition={{ ...COMMENT_MOTION.transition, delay: PENDING_REPLY_DELAY_S }}
            exit={{ ...COMMENT_MOTION.exit, transition: COMMENT_MOTION.transition }}
          >
            <AutoHeight>
              <PendingAgentNote text={pendingAgentText} />
            </AutoHeight>
          </motion.div>
        )}
      </AnimatePresence>

      {isReplying ? (
        <div className="flex gap-1.5">
          <ReplyMarker />
          <div className="min-w-0 flex-1">
            <NoteForm
              initialValue=""
              placeholder={MD_BUILDER_TEXT.replyPlaceholder}
              submitLabel={MD_BUILDER_TEXT.reply}
              onSubmit={(value) => {
                onReply(value);
                setIsReplying(false);
              }}
              onCancel={() => setIsReplying(false)}
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="self-start px-1 text-muted-foreground"
          onClick={() => setIsReplying(true)}
        >
          <Reply />
          {MD_BUILDER_TEXT.reply}
        </Button>
      )}
    </div>
  );
}

interface NoteViewProps {
  note: string;
  isNew: boolean;
  isDimmed: boolean;
  isReply: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function NoteView({ note, isNew, isDimmed, isReply, onEdit, onDelete }: NoteViewProps) {
  const { text, at } = splitNoteTime(note);
  const time = formatNoteTime(at);

  return (
    <div className={cn("group/note relative flex gap-1.5", isNew && "md-new-note")}>
      {isReply && <ReplyMarker isFilled={isNew} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isNew && (
          <span className="md-breathing md-unread-text flex items-center gap-1.5 font-mono text-11 font-semibold tracking-wider uppercase">
            <span aria-hidden className="md-unread-dot size-1.5 shrink-0 rounded-full" />
            {MD_BUILDER_TEXT.newNotes}
          </span>
        )}
        <NoteMarkdown
          text={text}
          className={cn(
            "transition-colors",
            isDimmed && "text-muted-foreground",
            isDimmed &&
              (isReply ? "group-hover/note:text-foreground" : "group-hover/card:text-foreground")
          )}
        />
      </div>

      <span className="absolute -top-1 right-0 flex items-center gap-0 bg-background opacity-0 transition-opacity group-hover/note:opacity-100 focus-within:opacity-100">
        {time && (
          <time
            dateTime={at ?? undefined}
            title={time.full}
            className="px-1 font-mono text-10 whitespace-nowrap text-muted-foreground"
          >
            {time.short}
          </time>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onEdit}
          aria-label={MD_BUILDER_TEXT.edit}
        >
          <Pencil />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="hover:text-destructive"
          onClick={onDelete}
          aria-label={MD_BUILDER_TEXT.remove}
        >
          <Trash2 />
        </Button>
      </span>
    </div>
  );
}

interface NoteFormProps {
  initialValue: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

function NoteForm({
  initialValue,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: NoteFormProps) {
  const [value, setValue] = useState(initialValue);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") onCancel();
    if (isSubmitShortcut(event) && value.trim()) onSubmit(value);
  }

  return (
    <div className="flex flex-col gap-1">
      <Textarea
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-12 border-border"
      />
      <span className="flex justify-end gap-0">
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          onClick={onCancel}
          aria-label={MD_BUILDER_TEXT.cancel}
        >
          <X />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-xs"
          className="border-l-0"
          disabled={!value.trim()}
          onClick={() => onSubmit(value)}
          aria-label={submitLabel}
        >
          <Check />
        </Button>
      </span>
    </div>
  );
}

function ReplyMarker({ isFilled = false }: { isFilled?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative min-h-4 w-3.5 shrink-0 self-stretch",
        isFilled ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span className="absolute top-2 bottom-2 left-[3px] w-px overflow-hidden">
        <span className="block h-6 w-px bg-linear-to-b from-muted-foreground/60 to-transparent" />
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-px left-0 size-3.5"
      >
        <path d="M9 12h12" />
        <circle cx="6" cy="12" r="3" fill={isFilled ? "currentColor" : "none"} />
      </svg>
    </span>
  );
}

interface QuoteProps {
  children: ReactNode;
}

function Quote({ children }: QuoteProps) {
  return (
    <p className="border-l-2 border-primary/60 bg-secondary/40 px-2 py-0.5 text-11 text-foreground/80 wrap-break-word">
      {children}
    </p>
  );
}

interface EmptyStateProps {
  isReady: boolean;
  rememberedName: string | null;
  onOpen: () => void;
  onUpload: () => void;
  onReopen: () => void;
  onPaste: () => void;
}

function EmptyState({
  isReady,
  rememberedName,
  onOpen,
  onUpload,
  onReopen,
  onPaste,
}: EmptyStateProps) {
  if (!isReady) return null;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="flex max-w-sm flex-col gap-1">
        <h3 className="text-sm font-medium">{MD_BUILDER_TEXT.emptyTitle}</h3>
        <p className="text-xs text-muted-foreground">
          {MD_BUILDER_TEXT.emptyBody}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button type="button" size="xs" onClick={onOpen}>
          <FolderOpen />
          {MD_BUILDER_TEXT.open}
        </Button>
        <Button type="button" variant="outline" size="xs" onClick={onUpload}>
          <Upload />
          {MD_BUILDER_TEXT.upload}
        </Button>
        {rememberedName && (
          <Button type="button" variant="outline" size="xs" onClick={onReopen}>
            {MD_BUILDER_TEXT.reopen} <FileName name={rememberedName} />
          </Button>
        )}
        <Button type="button" variant="outline" size="xs" onClick={onPaste}>
          {MD_BUILDER_TEXT.paste}
        </Button>
      </div>
      <p className="font-mono text-10 text-muted-foreground/70">
        or {MD_BUILDER_TEXT.dropHint} here
      </p>
    </div>
  );
}

interface PasteViewProps {
  onLoad: (text: string) => void;
  onCancel: () => void;
}

function PasteView({ onLoad, onCancel }: PasteViewProps) {
  const [text, setText] = useState("");

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Textarea
          autoFocus
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={MD_BUILDER_TEXT.pastePlaceholder}
          spellCheck={false}
          className="h-full min-h-0 w-full resize-none font-mono field-sizing-fixed"
        />
      </div>
      <div className="flex h-8 shrink-0 items-center justify-end gap-1 border-t border-border px-1">
        <Button type="button" variant="outline" size="xs" onClick={onCancel}>
          {MD_BUILDER_TEXT.cancel}
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={!text.trim()}
          onClick={() => onLoad(text)}
        >
          {MD_BUILDER_TEXT.showDocument}
        </Button>
      </div>
    </div>
  );
}

interface LivePanelProps {
  state: LiveModeState;
  hasAgentStarted: boolean;
  isAgentAway: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConnect: (session: ClientMcpSession) => void;
  onDisconnect: () => void;
}

function LivePanel({
  state,
  hasAgentStarted,
  isAgentAway,
  onOpenChange,
  onConnect,
  onDisconnect,
}: LivePanelProps) {
  const [setupId, setSetupId] = useState<(typeof LIVE_SETUP_COMMANDS)[number]["id"]>(
    LIVE_SETUP_COMMANDS[0].id
  );
  const setup =
    LIVE_SETUP_COMMANDS.find((command) => command.id === setupId) ?? LIVE_SETUP_COMMANDS[0];
  const connected = state.connected;

  return (
    <Popover open={state.isPanelOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="xs"
            className={cn(
              "min-w-0 shrink",
              connected &&
                hasAgentStarted &&
                "border-destructive text-destructive hover:text-destructive dark:border-destructive",
              connected && !hasAgentStarted && "border-destructive/50 dark:border-destructive/50"
            )}
          />
        }
      >
        <Radio />
        <span className="truncate">
          {MD_BUILDER_TEXT.live}
          {connected &&
            ` · ${hasAgentStarted ? "" : `${MD_BUILDER_TEXT.liveWaitingFor} `}${
              connected.agentName ?? MD_BUILDER_TEXT.liveUnknownAgent
            }`}
        </span>
        {connected && <LiveDot isActive={hasAgentStarted} />}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="max-h-(--available-height) w-md max-w-[calc(100vw-1rem)] gap-3 overflow-y-auto border-2 border-border p-3 text-xs/relaxed shadow-2xl shadow-black/50 ring-0"
      >
        <PopoverTitle>{MD_BUILDER_TEXT.liveTitle}</PopoverTitle>
        <p className="text-muted-foreground">{MD_BUILDER_TEXT.liveIntro}</p>

        <section className="flex flex-col gap-1.5">
          <h4 className="font-semibold">{MD_BUILDER_TEXT.liveStepSetup}</h4>
          <span className="flex">
            {LIVE_SETUP_COMMANDS.map((command, index) => (
              <Button
                key={command.id}
                type="button"
                variant={command.id === setupId ? "default" : "outline"}
                size="xs"
                className={cn(index > 0 && "border-l-0")}
                aria-pressed={command.id === setupId}
                onClick={() => setSetupId(command.id)}
              >
                {command.label}
              </Button>
            ))}
          </span>
          {setup.id === "cursor" && (
            <span className="text-muted-foreground">{MD_BUILDER_TEXT.liveStepCursorHint}</span>
          )}
          <CopyableCode value={setup.command} />
        </section>
        <section className="flex flex-col gap-1.5">
          <h4 className="font-semibold">{MD_BUILDER_TEXT.liveStepConnect}</h4>
          {connected ? (
            <div
              className={cn(
                "flex items-center gap-2 border p-2",
                hasAgentStarted ? "border-destructive" : "border-dashed border-destructive/50"
              )}
            >
              <LiveDot isActive={hasAgentStarted} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">
                  {MD_BUILDER_TEXT.liveConnectedTo}{" "}
                  {connected.agentName ?? MD_BUILDER_TEXT.liveUnknownAgent}
                </span>
                {hasAgentStarted ? (
                  <span className="truncate font-mono text-10 text-muted-foreground">
                    {connected.cwd}
                  </span>
                ) : (
                  <span className="md-breathing text-10 text-orange-500 dark:text-orange-400">
                    {isAgentAway ? MD_BUILDER_TEXT.liveAwayHint : MD_BUILDER_TEXT.liveHandshakeHint}
                  </span>
                )}
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="ml-auto"
                onClick={onDisconnect}
              >
                {MD_BUILDER_TEXT.liveDisconnect}
              </Button>
            </div>
          ) : (
            <>
              <SessionList state={state} onConnect={onConnect} />
              <p className="text-10 text-muted-foreground">{MD_BUILDER_TEXT.liveAutoConnectHint}</p>
              <p className="text-10 text-muted-foreground">{MD_BUILDER_TEXT.liveLocalNetworkHint}</p>
            </>
          )}
        </section>
        <section className="flex flex-col gap-1.5">
          <h4 className="font-semibold">{MD_BUILDER_TEXT.liveStepPrompt}</h4>
          <CopyableCode value={MD_BUILDER_TEXT.livePrompt} />
        </section>
        <section className="flex flex-col gap-1.5">
          <h4 className="font-semibold">{MD_BUILDER_TEXT.liveStepAllow}</h4>
          <p className="text-muted-foreground">{MD_BUILDER_TEXT.liveAllowWhy}</p>
          <span className="text-muted-foreground">{MD_BUILDER_TEXT.liveAllowHow}</span>
          <CopyableCode value={MD_BUILDER_TEXT.liveAllowRule} />
        </section>
        {state.message && (
          <p role="status" className="bg-destructive/10 p-2 text-destructive">
            {state.message}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface SessionListProps {
  state: LiveModeState;
  onConnect: (session: ClientMcpSession) => void;
}

function SessionList({ state, onConnect }: SessionListProps) {
  if (!state.sessions.length) {
    return (
      <p className="text-muted-foreground" aria-live="polite">
        {state.isScanning ? MD_BUILDER_TEXT.liveSearching : MD_BUILDER_TEXT.liveNoSessions}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {orderSessions(state.sessions).map((session) => (
        <li
          key={session.port}
          className={cn(
            "flex items-center gap-2 border border-border p-2",
            session.hostKind === "background" && !session.isAgentActive && "opacity-60"
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 truncate">
              {session.agentName ?? MD_BUILDER_TEXT.liveUnknownAgent}
              {!session.isAgentActive && (
                <span
                  title={MD_BUILDER_TEXT.liveIdleHint}
                  className="font-mono text-10 text-muted-foreground"
                >
                  · {MD_BUILDER_TEXT.liveIdle}
                </span>
              )}
            </span>
            <span
              title={session.isOutdated ? MD_BUILDER_TEXT.liveOutdatedHint : undefined}
              className="truncate text-10 text-muted-foreground"
            >
              {[
                session.isOutdated
                  ? MD_BUILDER_TEXT.liveOutdated
                  : sessionHostLabel(session.hostKind, session.hostApp),
                `${MD_BUILDER_TEXT.liveStarted} ${timeSince(session.startedAt, state.scannedAt)}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="truncate font-mono text-10 text-muted-foreground">{session.cwd}</span>
          </span>
          {session.isTaken ? (
            <span className="ml-auto shrink-0 text-muted-foreground">{MD_BUILDER_TEXT.liveInUse}</span>
          ) : (
            <Button
              type="button"
              size="xs"
              className="ml-auto"
              disabled={state.connectingPort !== null}
              onClick={() => onConnect(session)}
            >
              {state.connectingPort === session.port
                ? MD_BUILDER_TEXT.liveConnecting
                : MD_BUILDER_TEXT.liveConnect}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

function CopyableCode({ value }: { value: string }) {
  return (
    <div className="flex items-start gap-1">
      <pre className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word bg-muted p-2 font-mono text-10">
        {value}
      </pre>
      <CopyButton value={value} />
    </div>
  );
}

interface DroppedNotesProps {
  notes: DroppedOp[];
  onCopy: (index: number) => void;
  onDismiss: (index: number) => void;
}

function DroppedNotes({ notes, onCopy, onDismiss }: DroppedNotesProps) {
  return (
    <ul role="alert" className="flex shrink-0 flex-col gap-0.5 border-b border-border bg-destructive/10 p-1 text-destructive">
      {notes.map((dropped, index) => (
        <li key={index} className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate font-mono text-10">
            {MD_BUILDER_TEXT.droppedTitle}: {dropped.reason}
            {dropped.text && ` · "${dropped.text}"`}
          </span>
          {dropped.text && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onCopy(index)}
              aria-label={MD_BUILDER_TEXT.copyNote}
            >
              <Copy />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onDismiss(index)}
            aria-label={MD_BUILDER_TEXT.dismiss}
          >
            <X />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function FileName({ name }: { name: string }) {
  return (
    <code className="min-w-0 wrap-break-word bg-muted px-1 font-mono text-11 font-normal">
      {name}
    </code>
  );
}


function LiveDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        isActive ? "animate-pulse bg-destructive" : "border border-destructive"
      )}
    />
  );
}

function PendingAgentNote({ text }: { text: string }) {
  return (
    <div role="status" className="relative flex gap-1.5">
      <ReplyMarker />
      <p className="md-breathing min-w-0 flex-1 whitespace-pre-wrap text-xs text-muted-foreground wrap-break-word">
        {AGENT_PREFIX} {text}
      </p>
    </div>
  );
}

function NoteMarkdown({ text, className }: { text: string; className?: string }) {
  const markup = useMemo(() => ({ __html: renderMarkdown(text, []) }), [text]);
  return <div className={cn("md-doc md-note text-xs", className)} dangerouslySetInnerHTML={markup} />;
}

function AutoHeight({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [isAnimating, setIsAnimating] = useState(false);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => setHeight(content.offsetHeight));
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ height }}
      transition={COMMENT_MOTION.transition}
      onAnimationStart={() => setIsAnimating(true)}
      onAnimationComplete={() => setIsAnimating(false)}
      style={{ overflow: isAnimating ? "hidden" : "visible" }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}
