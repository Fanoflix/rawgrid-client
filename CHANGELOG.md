# Changelog

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
