import type { KeyboardEvent, MouseEvent, ReactNode, RefObject } from "react";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CornerDownRight,
  Ellipsis,
  FolderOpen,
  MessageSquarePlus,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { FontSizeButtons } from "@/components/font-size-buttons";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_MARKDOWN_EXTENSIONS,
  MD_BUILDER_CONFIG,
  MD_BUILDER_TEXT,
} from "@/tools/md-builder/lib/constants";
import type { ReviewComment } from "@/tools/md-builder/lib/critic-markup";
import { excerptOf } from "@/tools/md-builder/lib/critic-markup";
import {
  COMMENT_ID_ATTR,
  PENDING_COMMENT_ID,
} from "@/tools/md-builder/lib/render-markdown";
import type {
  CommentComposer,
  SelectionAnchor,
} from "@/tools/md-builder/lib/use-md-builder";
import { useMdBuilderWithCommands as useMdBuilder } from "@/tools/md-builder/lib/use-md-builder-commands";
import {
  isSubmitShortcut,
  scrollToCenter,
  splitAuthor,
} from "@/tools/md-builder/lib/utils";

const ACTIVE_CLASS = "md-active";
const HOVERED_CLASS = "md-hovered";
const BLINK_CLASS = "md-blink";

export function MdBuilderTool() {
  const {
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
  } = useMdBuilder();

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
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-1">
        <ToolInfo
          name="md builder"
          description="review a markdown file with comments an agent can read."
          triggerText="help"
          detailed="open a local .md file, select text and leave comments. save writes them into the file as criticmarkup ({==text==}{>>comment<<}), so you can hand the same file to an agent, let it reply or apply the comments, then hit refresh to read its changes back. nothing leaves your machine."
        />

        {state.hasDocument && (
          <span className="flex min-w-0 items-center gap-1 font-mono text-[10px] text-muted-foreground">
            <span className="truncate">{state.name}</span>
            {state.isDirty && (
              <span className="shrink-0 text-primary">
                ● {MD_BUILDER_TEXT.unsaved}
              </span>
            )}
          </span>
        )}

        {state.notice && (
          <span
            role="status"
            className="truncate font-mono text-[10px] text-muted-foreground"
          >
            {state.notice}
          </span>
        )}

        <span className="ml-auto flex items-center gap-1">
          {state.hasDocument && state.isStale && (
            <Button
              type="button"
              variant="primary-outline"
              size="xs"
              onClick={refresh}
              className="animate-attention-surface"
            >
              <RefreshCw />
              {MD_BUILDER_TEXT.changedOnDisk}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!state.hasDocument}
            onClick={() => void copyMarkdown()}
            className={cn(state.isCopied && "text-green-500 hover:text-green-500")}
          >
            <Copy />
            {MD_BUILDER_TEXT.copy}
            {state.isCopied && <Check />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={uploadFile}
          >
            <Upload />
            {MD_BUILDER_TEXT.upload}
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
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                disabled={!state.hasDocument}
                onClick={() => void save()}
              >
                <Save />
                {saveLabel}
              </DropdownMenuItem>
              {state.hasHandle && (
                <DropdownMenuItem onClick={refresh}>
                  <RefreshCw />
                  {MD_BUILDER_TEXT.refresh}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openFile}>
                <FolderOpen />
                {MD_BUILDER_TEXT.open}
              </DropdownMenuItem>
              {state.rememberedName && (
                <DropdownMenuItem onClick={reopenRemembered}>
                  {MD_BUILDER_TEXT.reopen} {state.rememberedName}
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
              <DropdownMenuItem onClick={() => void copyAgentBrief()}>
                copy agent brief
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
                agentCommentIds={state.agentCommentIds}
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
                  agentCommentIds={state.agentCommentIds}
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
        "relative h-full w-full overflow-y-auto",
        hideScrollbar && "[scrollbar-width:none]"
      )}
      onClick={handleClick}
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
    if (event.key === "Escape") onCancel();
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
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {MD_BUILDER_TEXT.submitHint}
        </span>
        <span className="ml-auto flex gap-1">
          <Button type="button" variant="outline" size="xs" onClick={onCancel}>
            {MD_BUILDER_TEXT.cancel}
          </Button>
          <Button
            type="button"
            size="xs"
            disabled={!note.trim()}
            onClick={() => onSubmit(note)}
          >
            {MD_BUILDER_TEXT.comment}
          </Button>
        </span>
      </div>
    </div>
  );
}

interface CommentsPaneProps {
  source: string;
  comments: ReviewComment[];
  activeCommentId: number | null;
  agentCommentIds: ReadonlySet<number>;
  onFocusComment: (id: number | null) => void;
  onHoverComment: (id: number | null) => void;
  onReply: (id: number, note: string) => void;
  onEdit: (id: number, noteIndex: number, note: string) => void;
  onDelete: (id: number, noteIndex: number) => void;
  onCollapse: () => void;
}

function CommentsPane({
  source,
  comments,
  activeCommentId,
  agentCommentIds,
  onFocusComment,
  onHoverComment,
  onReply,
  onEdit,
  onDelete,
  onCollapse,
}: CommentsPaneProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCommentId === null) return;
    listRef.current
      ?.querySelector(`[${COMMENT_ID_ATTR}="${activeCommentId}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeCommentId]);

  return (
    <div className="flex h-full w-full flex-col border-l border-border">
      <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border px-1">
        <span className="bg-accent/50 p-1 font-mono text-[10px] text-muted-foreground">
          {MD_BUILDER_TEXT.commentsTitle}
          {comments.length > 0 && ` (${comments.length})`}
        </span>
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
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1">
        {comments.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            {MD_BUILDER_TEXT.noComments}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                excerpt={excerptOf(
                  source,
                  comment,
                  MD_BUILDER_CONFIG.excerptLength
                )}
                isActive={comment.id === activeCommentId}
                isAgent={agentCommentIds.has(comment.id)}
                onFocus={() => onFocusComment(comment.id)}
                onHover={(isHovering) =>
                  onHoverComment(isHovering ? comment.id : null)
                }
                onReply={(note) => onReply(comment.id, note)}
                onEdit={(noteIndex, note) => onEdit(comment.id, noteIndex, note)}
                onDelete={(noteIndex) => onDelete(comment.id, noteIndex)}
              />
            ))}
          </div>
        )}
      </div>
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
  agentCommentIds: ReadonlySet<number>;
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
  agentCommentIds,
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
                agentCommentIds.has(marker.id)
                  ? "bg-(--md-agent)/80 group-hover/marker:bg-(--md-agent)"
                  : "bg-primary/80 group-hover/marker:bg-primary",
                marker.id === activeCommentId &&
                  (agentCommentIds.has(marker.id)
                    ? "h-1 bg-(--md-agent)"
                    : "h-1 bg-primary")
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
  isAgent: boolean;
  onFocus: () => void;
  onHover: (isHovering: boolean) => void;
  onReply: (note: string) => void;
  onEdit: (noteIndex: number, note: string) => void;
  onDelete: (noteIndex: number) => void;
}

function CommentCard({
  comment,
  excerpt,
  isActive,
  isAgent,
  onFocus,
  onHover,
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
        "flex flex-col gap-1 border border-border p-2 transition-colors",
        isAgent ? "bg-(--md-agent)/8" : "bg-background",
        isActive && (isAgent ? "border-(--md-agent)" : "border-primary")
      )}
      onClick={handleCardClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {comment.end > comment.start && (
        <Quote isAgent={isAgent}>{excerpt}</Quote>
      )}

      {comment.notes.map((note, index) => (
        <Fragment key={index}>
          {index > 0 && <ReplySeparator />}
          {editingIndex === index ? (
            <NoteForm
              initialValue={note}
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
              isReply={index > 0}
              isLast={index === comment.notes.length - 1}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => onDelete(index)}
              onReply={() => setIsReplying(true)}
            />
          )}
        </Fragment>
      ))}

      {isReplying && <ReplySeparator />}
      {isReplying && (
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
      )}
    </div>
  );
}

interface NoteViewProps {
  note: string;
  isReply: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
}

function NoteView({
  note,
  isReply,
  isLast,
  onEdit,
  onDelete,
  onReply,
}: NoteViewProps) {
  const { author, text } = splitAuthor(note);

  return (
    <div
      className={cn(
        "group/note relative flex flex-col gap-0.5",
        isReply && "ml-2 border-l-2 border-border pl-2"
      )}
    >
      <p
        className={cn(
          "whitespace-pre-wrap text-xs wrap-break-word",
          author && "text-(--md-agent)"
        )}
      >
        {text}
      </p>
      <span className="absolute -top-1 right-0 flex gap-0 bg-background opacity-0 transition-opacity group-hover/note:opacity-100 focus-within:opacity-100">
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
        {isLast && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onReply}
            aria-label={MD_BUILDER_TEXT.reply}
          >
            <CornerDownRight />
          </Button>
        )}
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

function ReplySeparator() {
  return <div className="mx-3 my-0.5 border-t border-dashed border-border" />;
}

interface QuoteProps {
  children: ReactNode;
  isAgent?: boolean;
}

function Quote({ children, isAgent = false }: QuoteProps) {
  return (
    <p
      className={cn(
        "border-l-2 pl-2 text-[11px] text-muted-foreground wrap-break-word",
        isAgent ? "border-(--md-agent)/70" : "border-primary/60"
      )}
    >
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
            {MD_BUILDER_TEXT.reopen} {rememberedName}
          </Button>
        )}
        <Button type="button" variant="outline" size="xs" onClick={onPaste}>
          {MD_BUILDER_TEXT.paste}
        </Button>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground/70">
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
