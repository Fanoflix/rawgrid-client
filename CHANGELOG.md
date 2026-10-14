# Changelog

## 1.0.0

### Focus mode

The headline of this release. Hover any tool and click the focus icon next to its name in the top bar, or pick "focus <tool>" from the command palette, and that tool takes over the whole grid. Every other tool stays loaded and waits in a tab strip above it, visible ones first and hidden ones washed out at the end, so you can jump between tools with one click. Press `Escape`, click the slashed focus icon, or run a palette command for another visible tool, and your saved layout comes straight back. Focus mode survives a reload.

### MD Builder

A new tool for reviewing a markdown file with comments that a coding agent can read and answer. Open a local `.md` file with write-back on Chrome and Edge, upload a copy, drag it in, or paste. Select text and leave threaded comments. Saving writes them into the file as CriticMarkup (`{==text==}{>>comment<<}`), and the tool flags when the file changes on disk so you can reload the agent's replies. Agent replies are tinted blue, the comment panel collapses into a minimap, and there is a one-click brief that explains the format to an agent.

Idea by [@TheSalarKhan](https://github.com/TheSalarKhan), thank you.

### Ranked command palette

Searching the palette ranks instead of filtering. "md paste" finds the paste command and "md play" lists the MD Builder commands before the timer. Short typos are forgiven.

### Everything in one place

All tool state, the grid layout, the size of every space, the timer run, the video you loaded and your font sizes now live in a single IndexedDB database. Old data migrates on first load. Clearing a field now survives a reload, edits made during the first moments after load are no longer overwritten, and the last edit before closing a tab is no longer lost.

### Fixes

- The top bar hint slides out to the right instead of snapping away.
- Theme commands from the palette always apply, and the landing page no longer loads in the wrong theme.
- Inner panel splits inside tools were being read as pixels and are now real percentages.
- Hidden spaces no longer reappear when a layout was saved without them.

### For contributors

`AGENTS.md` documents the codebase, the persistence rules, a blueprint for adding a tool and the gotchas found along the way. Vitest is set up with unit tests and seeded fuzz tests for the markdown renderer, the CriticMarkup round trip and the palette matcher.
