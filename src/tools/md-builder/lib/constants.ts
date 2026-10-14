export interface MdBuilderConfig {
  defaultFontSize: number;
  minFontSize: number;
  maxFontSize: number;
  diskPollMs: number;
  excerptLength: number;
  focusScrollMs: number;
  blinkMs: number;
  copiedFeedbackMs: number;
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

export const MD_BUILDER_TEXT = {
  comment: "comment",
  reply: "reply",
  edit: "edit",
  remove: "remove",
  cancel: "cancel",
  save: "save",
  saveAs: "save as",
  open: "open",
  upload: "upload md",
  reopen: "reopen",
  refresh: "refresh",
  download: "download",
  copy: "copy as md",
  paste: "paste markdown",
  close: "close",
  unsaved: "unsaved",
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
  submitHint: "ctrl/cmd + enter",
  overlapError: "that text already has a comment.",
  markupError: "that selection contains criticmarkup. select other text.",
  discardPrompt: "you have unsaved comments. discard them?",
  diskChangedPrompt:
    "the file changed on disk after you opened it. saving will replace those changes. save anyway?",
  loadError: "could not read the file",
  saveError: "could not save the file",
  permissionError: "allow access to the file to reopen it.",
  agentBrief:
    "This markdown file contains review comments written as CriticMarkup. `{==quoted text==}{>>comment<<}` attaches a comment to the quoted text, and `{>>comment<<}` on its own is a comment about that spot. Several `{>>...<<}` blocks after one highlight form a thread, in order. Reply to a comment by adding a new `{>>...<<}` block right after the last one in that thread, prefixed with `agent:`. When a comment is resolved, apply the requested change and remove the markup for that thread. Leave all other content untouched.",
} as const;
