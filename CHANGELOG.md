# Changelog

## 1.2.0

### UX

- MD Builder live mode. Add `@rawgrid/client-mcp` to your agent once, click `live` in MD Builder, and connect to the agent's session. The agent can read the document, wait for your comments, reply, start threads, edit text and apply changes you agreed to. It can never resolve a thread. Its changes appear as they happen and are written to the file. Each comment, reply, edit or delete reaches the agent the moment you post it, and is written to the file, so there is nothing to save and the agent no longer has to watch the file. The live panel has copy-ready setup for Claude Code, Codex and Cursor, using `@rawgrid/client-mcp@latest` so agents always start the newest server, plus the prompt to give your agent.
- Unsaved comments survive agent changes. If the agent changes the document while you have unsaved comments, yours are kept on top of its changes. A comment that can no longer apply, for example a reply to a thread the agent just resolved, is listed in a strip so you can copy it.
- The agent brief in the `⋯` menu names the open file and quotes its first line, so the agent can find the right file even though the browser never shares its folder. It also spells out the rules. The agent answers only threads whose last note is yours, applies a change only when you asked for it or agreed, never edits your notes, and never writes markup that breaks the file. While live mode is connected, the same menu item copies the live prompt instead.
- Only you resolve threads. Each comment card has a ✓ button. Resolved threads move to a "resolved" tab in the sidebar with their notes and when they were resolved, and "reopen" puts a thread back on its text while that text is still in the document.
- The agent's status shows in MD Builder's header while live: "thinking…", what it said it's working on, or "waiting for your next comment". While it works, the status slowly cycles orange, red, dark purple, red, orange.
- When you post, reply to or edit a comment while the agent is engaged, that thread shows the agent's reply-to-be half a second later: the same marker and text size as a real reply, reading "agent: thinking…" or the agent's own status, breathing in muted text. When the real reply arrives, it takes over the same slot and only the text changes. If the agent moves on without replying, the placeholder collapses.
- Comments and replies slide in from the top with a quick circOut ease (0.175s), and the sidebar scrolls to a new reply from the agent.
- The reply button sits at the bottom left of each thread.
- After you select text, the "comment" button shows its shortcut, `⌘↵` (`ctrl+↵` elsewhere), the same keys that post a comment. In the comment box, the buttons show their shortcuts (`esc` to cancel, `⌘↵` to post) instead of a hint line, and `esc` closes the box wherever focus is.
- Keyboard shortcut chips across the app (top bar, focus mode, command palette, md builder) share one style on the secondary color.
- The live panel's steps are: add rawgrid to your agent, connect, then copy the prompt. The prompt stays available after you connect.
- Connecting sends any comments you wrote before connecting, so the agent sees what you see.
- Connecting no longer looks like the agent is ready. Until the agent calls md builder over this connection, the live button reads "live · waiting for claude-code" with a hollow dot, and the panel and header tell you, in breathing orange text, to paste the prompt into your agent. Every connect starts in this state, so reconnecting to an agent that stopped listening no longer looks live; an agent that is still waiting turns it live within a second. Once it starts, the button turns red with a pulsing round dot.
- After a page reload, md builder reconnects to the session you connected to, even if its agent hasn't started yet.
- Live mode connects on its own only to an agent that has started using rawgrid. Every Claude process loads your MCP servers, including Claude Code's pre-warmed background sessions that have no terminal, and md builder used to connect to those. Now you can paste the prompt into your agent and md builder connects as soon as the agent's first call arrives. Sessions that haven't used rawgrid yet are listed as "idle" and can still be connected by hand. Each session also says where it runs (for example "vscodium terminal" or "background, no terminal") and when it started. Sessions already using rawgrid are listed first and background ones last, dimmed. A session running an older rawgrid server, which can't report where it runs, is labelled "older version".
- Reloading the page no longer stops the agent. Its waiting call holds for the tab to come back, and if md builder reloaded, the agent is told to read the document again before changing anything.
- Comment cards have a light secondary background (15%), and the quoted text on each card sits on a stronger secondary background (40%). Cards and notes have more space between them.
- Each reply starts with a dot-and-line marker. Replies longer than one line also get a line that runs down from the dot's center and fades out within 24px, in place of the dashed separators. The reply button uses the reply arrow, and comment cards brighten slightly on hover. Hovering a highlight in the document brightens its card in the sidebar the same way.
- Settings have a secondary color per mode, next to primary.
- New notes stand out without depending on your theme colors. While anything is new, every other note in the sidebar dims (hovering a card brings back its comment, and each reply comes back when you hover that reply), a new reply's marker dot is filled, a faint wash fades out over a second when it arrives, and a breathing "● NEW" label in a primary-and-red mix replaces the red bar. The "n new" button in the comments header explains itself on hover.
- Comments and replies render markdown (bold, lists, code, links, headings) at note size. The edit box still shows the raw text.
- Each comment and reply records when it was written, and hovering a note shows the time next to its edit and delete buttons. The time lives in the file, inside the note, as an HTML comment such as `<!--rg:2026-10-22T10:42:05Z-->`, so it can't drift from its note. CriticMarkup ignores it and markdown renderers hide it. md builder stamps your notes (an edit gets a new time) and the agent's live replies; the agent brief asks agents to stamp their own.
- New notes stay highlighted. After a refresh, the notes that were not there before are marked "new" until the next refresh. In live mode, each round of agent changes after you save replaces the highlights. The `n new` button in the comments header jumps between them.
- MD Builder has a save button in its header instead of in the `⋯` menu. It is highlighted while you have unsaved comments, and shows "saved" when the file is written.
- `⌘S` (`ctrl+S` elsewhere) saves MD Builder while your cursor is over it, or while it is the focused tool. On the tools page `⌘S` never opens the browser's "save page" dialog.
- Settings open as a popover under the cog instead of a modal. Nothing blurs the page, so you see each change as you make it. A 2px border and a shadow set it apart from the page.
- Settings are grouped under "fonts" and "theme" headings. Only the headings are bold; labels and notes use regular weight.

### Fixes

- Markdown links whose target is `javascript:`, `vbscript:` or `data:` now render as plain text instead of a clickable link, in the document and in notes.
- Copy buttons no longer change width when they switch to "copied", so nothing next to them moves.
- File names in MD Builder's reopen buttons show in mono, like code.
- MD Builder no longer cuts off the document under the comments sidebar. A long code block used to set the document's minimum width, so text ran under the sidebar. The document now wraps to the space it has, and wide code blocks scroll on their own.

## 1.1.0

### UX

- A settings button (cog) in the top bar opens a settings modal. The palette opens it too with "open settings"; ESC then takes you back to the palette. The light/dark toggle stays in the top bar and is in the modal too.
- Pick the primary color for light and dark mode separately, plus the ui font and the code font. Changes apply as you make them and survive reloads without a flash.
- "Edit in json" shows every setting as JSON. Colors have a swatch that opens a picker and fonts have a ▾ that opens the font list. Valid JSON applies as you type; unknown keys or bad values are listed and nothing is applied. Copy it to share a theme.
- ESC leaves edit spaces mode. If you changed the layout, it asks whether to keep or discard the changes.
- The font size slider scales every font in the app from 90% to 150% in 10% steps, like browser zoom but for text only. Each tool's own font size scales with it. The palette has "bigger text", "smaller text" and "reset text size".
- When a tool header label is cut off, hovering it shows the full text right away.

### Fixes

- MD Builder no longer treats comments as agent replies. A note that started with a short word and a colon, like "Questions:", turned blue and lost that word. Every comment now looks the same and shows its full text.

## 1.0.2

### UX

- `⌘⇧+` and `⌘⇧-` (`ctrl` on other systems) change the font size of the tool under your cursor instead of zooming the page. In focus mode they apply to the focused tool.
- The stacked textareas share one font size, so the hotkey and the buttons change every row together.

## 1.0.1

### Fixes

- Reloading the tools page right after a deploy could bring back the previous version for a few minutes. The page now skips the browser cache on that path.
- Adding a new tool no longer resets your layout. Your arrangement, hidden spaces and sizes stay, and the new tool takes the new space.

## 1.0.0

### New tools

**MD Builder.** Review a markdown file with comments an agent can read and answer.

- Open a local `.md` file (saves back to it on Chrome and Edge), upload a copy, drag it in, or paste.
- Select text and add a comment. Reply, edit and delete.
- Save writes the comments into the file as CriticMarkup: `{==text==}{>>comment<<}`.
- The tool tells you when the file changed on disk, so you can reload the agent's replies.
- Agent replies show in blue. The comment panel collapses into a minimap.
- One click copies a short brief that explains the format to an agent.

Idea by [@TheSalarKhan](https://github.com/TheSalarKhan). Thank you.

### UX

**Focus mode.** The big one.

- Click "focus mode" in the top bar, press `⌘⇧F`, or run "focus <tool>" from the palette.
- The tool under your cursor fills the grid. The others wait in a tab strip above it. Hidden tools sit at the end, washed out.
- Press `Escape`, click the button again, or run a palette command for another visible tool to get your layout back.
- Focus mode survives a reload.

**Command palette.**

- Results are ranked, not filtered. "md paste" finds paste markdown. "md play" lists the MD Builder commands before the timer.
- Small typos still match.

**Your data.**

- Everything is saved in one place: tool inputs, the layout, the size of every space, the running timer, the video you loaded, and font sizes.
- Old data moves over on first load.
- Clearing a field stays cleared after a reload.
- Edits made right after the page loads are no longer lost.
- The last edit before closing a tab is no longer lost.

**Fixes.**

- The tool name in the top bar slides out to the right instead of snapping away.
- Theme commands from the palette always work. The landing page loads in the right theme.
- Splits inside tools were read as pixels. They are percentages now.
- Hidden spaces no longer come back on their own.

### For contributors

- `AGENTS.md` explains the codebase, how data is saved, how to add a tool, and the gotchas.
- Tests run with `yarn test`. They include fuzz tests for the markdown renderer, the CriticMarkup round trip and the palette matcher.
