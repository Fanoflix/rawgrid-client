export interface MdBuilderConfig {
  defaultFontSize: number;
  minFontSize: number;
  maxFontSize: number;
  diskPollMs: number;
  excerptLength: number;
  focusScrollMs: number;
  blinkMs: number;
  copiedFeedbackMs: number;
  liveScanMs: number;
  agentAwayMs: number;
  eventQuoteEdge: number;
  waitDefaultSeconds: number;
  waitMaxSeconds: number;
}

export const MD_BUILDER_CONFIG: MdBuilderConfig = {
  defaultFontSize: 13,
  minFontSize: 10,
  maxFontSize: 20,
  diskPollMs: 2000,
  excerptLength: 160,
  focusScrollMs: 250,
  blinkMs: 900,
  copiedFeedbackMs: 1000,
  liveScanMs: 4000,
  agentAwayMs: 120_000,
  eventQuoteEdge: 300,
  waitDefaultSeconds: 50,
  waitMaxSeconds: 50,
};

export const DEFAULT_DOCUMENT_NAME = "untitled.md";
export const PASTED_DOCUMENT_NAME = "pasted.md";
export const REVIEWED_SUFFIX = ".reviewed";

export const ACCEPTED_MARKDOWN_EXTENSIONS = ".md,.markdown,.txt";

export const MARKDOWN_PICKER_TYPES = [
  {
    description: "Markdown",
    accept: {
      "text/markdown": [".md", ".markdown"],
      "text/plain": [".txt"],
    },
  },
];

export const MD_BUILDER_COMMANDS = {
  open: "md-builder:open",
  upload: "md-builder:upload",
  save: "md-builder:save",
  refresh: "md-builder:refresh",
  paste: "md-builder:paste",
  copy: "md-builder:copy",
} as const;

export const COMMENT_MOTION = {
  initial: { height: 0, opacity: 0, overflow: "hidden" },
  animate: { height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } },
  exit: { height: 0, opacity: 0, overflow: "hidden" },
  transition: { duration: 0.175, ease: "circOut" },
} as const;

export const COMMENT_SCROLL_DELAY_MS = 195;

export const PENDING_REPLY_DELAY_S = 0.5;

export const COMMENT_SHORTCUT = { key: "Enter", label: "↵" } as const;
export const CANCEL_SHORTCUT = { key: "Escape", label: "esc" } as const;

export const LIVE_TOOL_NAMES = {
  getDocument: "get_document",
  waitForActivity: "wait_for_activity",
  reply: "reply",
  applyChange: "apply_change",
  editText: "edit_text",
  comment: "comment",
  setStatus: "set_status",
  addImage: "add_image",
} as const;

export const AGENT_STATUS_MAX_LENGTH = 80;

const NOTE_TEXT_SCHEMA = {
  type: "string",
  description:
    "markdown, written exactly as you would write your reply to the user in chat: the same paragraphs, lists, bold, code spans and code blocks, with real line breaks. md builder renders it the same way. Don't sign it; md builder already labels your notes.",
} as const;

export const LIVE_TOOLS = [
  {
    name: LIVE_TOOL_NAMES.getDocument,
    description:
      "Returns the document open in md builder: its markdown without comment markup, every comment thread with its id (t1, t2, ...), the line it starts on, the quoted text, and each note with its author (user or agent). Also returns path, the file's path when md builder found it in your project, and seq, the number of the latest change. Pass seq to wait_for_activity as sinceSeq and to apply_change as baseSeq.",
    inputSchema: {
      type: "object",
      properties: {
        documentPath: {
          type: "string",
          description:
            "the markdown file's path, when path comes back null because several files in your project share its name. md builder remembers it, so images in the document show.",
        },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: LIVE_TOOL_NAMES.waitForActivity,
    description:
      "Waits until the user adds, replies to, edits or deletes a comment after sinceSeq, then returns them with the new seq. A quote longer than 600 characters arrives as its first and last 300 joined by …, with quoteLength giving its full length; get_document has the full text. Returns an empty list with timedOut true after timeoutSeconds (at most 50), so call it again. Call it in a loop to keep reviewing.",
    inputSchema: {
      type: "object",
      properties: {
        sinceSeq: { type: "integer", description: "the seq you last read; defaults to the current seq" },
        timeoutSeconds: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: LIVE_TOOL_NAMES.reply,
    description:
      "Adds your reply to the end of a comment thread. It shows to the user as an agent note, rendered as markdown.",
    inputSchema: {
      type: "object",
      properties: { threadId: { type: "string" }, text: NOTE_TEXT_SCHEMA },
      required: ["threadId", "text"],
    },
  },
  {
    name: LIVE_TOOL_NAMES.applyChange,
    description:
      "Replaces a thread's quoted text with the change the user asked for or agreed to. The thread stays open; only the user can resolve threads. Rejected with new_activity if the user added to the thread after baseSeq, so read their latest note first.",
    inputSchema: {
      type: "object",
      properties: {
        threadId: { type: "string" },
        baseSeq: { type: "integer" },
        replacement: { type: "string" },
      },
      required: ["threadId", "baseSeq", "replacement"],
    },
  },
  {
    name: LIVE_TOOL_NAMES.editText,
    description:
      "Replaces text in the document. old must match the markdown from get_document exactly once and must not overlap a commented passage.",
    inputSchema: {
      type: "object",
      properties: { old: { type: "string" }, new: { type: "string" } },
      required: ["old", "new"],
    },
  },
  {
    name: LIVE_TOOL_NAMES.addImage,
    description:
      "Adds an image to the document on its own line, after the line that contains `after`. path is the image file (png, jpg, gif, webp, avif or svg, up to 10 MB), absolute or relative to your working directory, and must be inside your project folder; copy an image from elsewhere into the project first, for example into an images folder next to the document. md builder writes it as ![alt](path relative to the document) and shows it. after must match the markdown from get_document exactly once. If md builder can't find the document in your project, pass documentPath, the markdown file's path.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        alt: { type: "string", description: "a short description of the image" },
        after: { type: "string" },
        documentPath: { type: "string" },
      },
      required: ["path", "after"],
    },
  },
  {
    name: LIVE_TOOL_NAMES.setStatus,
    description:
      "Shows a short status line in md builder, such as 'Rewriting the problem statement'. Call it before you start on a thread, with that thread's id, so the user sees what you are doing in the header and in the thread itself. Keep it under 80 characters.",
    inputSchema: {
      type: "object",
      properties: { text: { type: "string" }, threadId: { type: "string" } },
      required: ["text"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: LIVE_TOOL_NAMES.comment,
    description:
      "Starts a new thread on a quote that appears exactly once in the markdown and stays within one line.",
    inputSchema: {
      type: "object",
      properties: { quote: { type: "string" }, text: NOTE_TEXT_SCHEMA },
      required: ["quote", "text"],
    },
  },
];

export const LIVE_SETUP_COMMANDS = [
  { id: "claude", label: "claude code", command: "claude mcp add --scope user rawgrid -- npx -y @rawgrid/client-mcp@latest" },
  { id: "codex", label: "codex", command: "codex mcp add rawgrid -- npx -y @rawgrid/client-mcp@latest" },
  {
    id: "cursor",
    label: "cursor",
    command: JSON.stringify(
      { mcpServers: { rawgrid: { command: "npx", args: ["-y", "@rawgrid/client-mcp@latest"] } } },
      null,
      2
    ),
  },
] as const;

export const MD_BUILDER_TEXT = {
  comment: "comment",
  reply: "reply",
  edit: "edit",
  remove: "remove",
  cancel: "cancel",
  save: "save",
  saveAs: "save as",
  saved: "saved",
  saveHint: "save comments into the file",
  open: "open",
  upload: "upload md",
  reopen: "reopen",
  refresh: "refresh",
  download: "download",
  copy: "copy as md",
  paste: "paste markdown",
  close: "close",
  unsaved: "unsaved",
  fileFromDisk: "opened from disk. save writes back to this file.",
  fileFromPaste: "pasted text. save as to keep it as a file.",
  fileFromUpload: "an uploaded copy. save as to keep your changes.",
  fileFolderHidden: "browsers don't share a file's folder, so the full path isn't known here.",
  fileAgentFolder: "agent project:",
  fileLocated: "the connected agent found it in its project, so images next to it show here.",
  changedOnDisk: "changed on disk",
  commentsTitle: "comments",
  collapseComments: "collapse comments",
  expandComments: "expand comments",
  noComments: "select text in the document to leave a comment.",
  commentPlaceholder: "write a comment",
  replyPlaceholder: "write a reply",
  pastePlaceholder: "paste markdown here",
  showDocument: "show document",
  dropHint: "drop a markdown file",
  emptyTitle: "review a markdown file",
  emptyBody:
    "open a .md file, select text, leave comments. save writes them into the file as criticmarkup so an agent can read and answer them. refresh reloads the file after the agent edits it.",
  overlapError: "that text already has a comment.",
  markupError: "that selection contains criticmarkup. select other text.",
  discardPrompt: "you have unsaved comments. discard them?",
  diskChangedPrompt:
    "the file changed on disk after you opened it. saving will replace those changes. save anyway?",
  loadError: "could not read the file",
  saveError: "could not save the file",
  permissionError: "allow access to the file to reopen it.",
  live: "live",
  liveTitle: "live mode",
  liveIntro:
    "let an agent read this document and answer each comment as soon as you post it. the agent starts a small local server that md builder connects to. nothing leaves your machine.",
  liveStepSetup: "1. add rawgrid to your agent (once)",
  liveStepCursorHint: "add this to ~/.cursor/mcp.json",
  liveStepConnect: "2. connect to the agent's session",
  liveStepPrompt: "3. tell your agent",
  liveStepAllow: "4. let it keep listening (optional)",
  liveAllowWhy:
    "keeps long sessions going: your agent never stops for a permission prompt or an auto-mode block on rawgrid's tools.",
  liveAllowHow: "in claude code, run /permissions and add this allow rule:",
  liveAllowRule: "mcp__rawgrid",
  livePrompt: [
    "Use the rawgrid tools to review the document open in md builder.",
    "",
    "1. Call get_document. Notes from you have author agent; all others are mine.",
    "2. Answer every thread whose last note is mine. Skip threads whose last note is yours. Before you start on a thread, call set_status with its threadId and a few words about what you're doing.",
    "   - If I asked for a change or agreed to your suggestion, apply it with apply_change (or edit_text for text outside the quote), then reply saying what you changed.",
    "   - Otherwise answer with reply.",
    "   - You can't resolve threads. I resolve them myself.",
    "   - Write each note exactly as you would write your reply to me in this chat, in markdown with real line breaks: paragraphs, lists, bold and code blocks all show the same way in md builder. Don't sign notes.",
    "3. Call wait_for_activity with the latest seq you read, and repeat step 2 for each new event. Keep going until I tell you to stop.",
    "",
    "Always pass the latest seq you read as baseSeq. If a call is rejected, follow the reason it gives, usually by calling get_document again. If md builder disconnects, keep calling wait_for_activity: it reconnects on its own after a page reload. If wait_for_activity says md builder reloaded, call get_document before anything else.",
  ].join("\n"),
  liveSearching: "looking for agents…",
  liveNoSessions: "no agent found yet. finish step 1, start your agent, then keep this open.",
  liveLocalNetworkHint:
    "the first time, your browser may ask to let this site connect to devices on your local network. that's how it reaches the agent's local server.",
  liveConnect: "connect",
  liveConnecting: "connecting…",
  liveInUse: "in use by another tab",
  liveIdle: "idle",
  liveWaitingFor: "waiting for",
  liveHandshakeHint:
    "connected, but your agent hasn't used rawgrid yet. paste the prompt from step 3 into it.",
  liveHeaderWaiting: "connected · paste the live prompt into your agent",
  liveHeaderAway: "isn't listening · ask it to carry on",
  liveAwayHint:
    "your agent hasn't called md builder for 2 minutes, so it may have stopped. ask it to carry on, or paste the prompt from step 3 again.",
  liveHostBackground: "background, no terminal",
  liveOutdated: "older version",
  liveOutdatedHint: "this session runs an older rawgrid server that can't say where it runs. start a new agent session to update it.",
  liveHostTerminal: "terminal",
  liveStarted: "started",
  liveJustNow: "just now",
  liveAgo: "ago",
  liveIdleHint: "this session hasn't used rawgrid yet. it may be a background session with no terminal.",
  liveAutoConnectHint:
    "md builder connects on its own as soon as your agent starts using rawgrid, so you can also just paste the prompt from step 3.",
  liveConnectedTo: "connected to",
  liveDisconnect: "disconnect",
  liveUnknownAgent: "agent",
  liveClientName: "md builder",
  liveReplaced: "another tab took over this agent session.",
  liveConnectFailed: "could not connect to that session. it may have closed.",
  liveNoDocument: "md builder has no document open. ask the user to open one.",
  droppedTitle: "not kept",
  dismiss: "dismiss",
  copyNote: "copy note",
  newNotes: "new",
  nextNew: "threads with new notes since your last action. click to jump to the next one.",
  composerMoved: "the agent changed the text you selected. select it again.",
  agentWaiting: "waiting for your next comment",
  agentThinking: "thinking…",
  agentReloaded:
    "md builder reloaded, so thread ids and seq changed. call get_document before anything else.",
  resolve: "resolve",
  resolveThread: "resolve thread",
  resolvedTitle: "resolved",
  noResolved: "resolved threads show up here.",
  reopenThread: "reopen",
  reopenUnavailable: "the quoted text changed, so this thread can't be put back on it.",
  resolvedNotice: "thread resolved",
  reopenedNotice: "thread reopened",
  copyAgentBrief: "copy agent brief",
  copyLivePrompt: "copy live prompt",
  copiedAgentBrief: "copied agent brief",
  copiedLivePrompt: "copied live prompt",
  agentBriefFilePlaceholder: "{file}",
  agentBriefLocatePlaceholder: "{locate}",
  agentBriefLocate: "Its first line is `{start}`.",
  agentBriefStartPlaceholder: "{start}",
  agentBrief: [
    "Review the comments in `{file}`. {locate} Find it in this project. If you can't, or several files match, ask me which one.",
    "",
    "The comments are written as CriticMarkup:",
    "- `{==quoted text==}{>>comment<<}` is a comment on the quoted text. `{>>comment<<}` on its own is a comment about that spot.",
    "- Several `{>>...<<}` blocks after one highlight form a thread, oldest first. Notes starting with `agent:` are yours; all others are mine.",
    "",
    "For each thread whose last note is mine:",
    "- Reply by adding `{>>agent: your reply<<}` right after the last block in that thread.",
    "- If I asked for a change or agreed to your suggestion, make the change inside the highlight, keep the `{==` `==}` around the new text, and reply saying what you changed.",
    "- Never remove a thread's markup. I resolve threads myself.",
    "- Write each note exactly as you would write your reply to me in this chat, in markdown with real line breaks: paragraphs, lists, bold and code blocks all show the same way in md builder. A note can span several lines. Don't sign notes.",
    "Skip threads whose last note is yours.",
    "",
    "Notes may end with a time marker such as `<!--rg:2026-10-22T10:42:05Z-->`. Leave existing markers as they are, and end each note you add with one holding the current UTC time (`date -u +%Y-%m-%dT%H:%M:%SZ`).",
    "",
    "Rules: never edit or delete my notes. Never put `{==`, `==}`, `{>>` or `<<}` inside a note. Keep each highlight within one paragraph, and never overlap or nest highlights. Leave everything else untouched. Write the whole file in one go.",
    "",
    "Then watch the file. When I save new comments, repeat, until I tell you to stop.",
  ].join("\n"),
} as const;
