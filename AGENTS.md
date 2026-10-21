# rawgrid agent guide

rawgrid is a browser-only developer toolbox. Every tool runs client side, sits in a resizable grid, and keeps its state in IndexedDB. Read this file before changing anything, and keep it current when you add a tool or hit a new gotcha.

## Stack

- React 19, TypeScript 5.9 with `strict`, `verbatimModuleSyntax` and `erasableSyntaxOnly` (no enums, no namespaces, no parameter properties).
- Vite 7, Tailwind CSS 4 with OKLCH tokens, shadcn components built on Base UI, all with `rounded-none`.
- react-resizable-panels 4 for the grid, dnd-kit for dragging spaces, CodeMirror 6 for JSON editors, idb for IndexedDB.
- Vitest for pure logic. Run `yarn test`. There is no DOM test environment, so keep tested code free of `window` and `document` at module top level.
- Package manager is Yarn 4. Use `yarn add`, never npm.

Commands: `yarn dev`, `yarn build` (runs `tsc -b` first), `yarn lint`, `yarn test`.

## Where things live

| Path | What it is |
| --- | --- |
| `src/main.tsx` | Router. `/` is the landing page, `/tools` is the grid. StrictMode is on. |
| `src/App.tsx` | Renders the grid from `GRID_TREE`, wires drag and drop, command palette, theme and layout commands. |
| `src/lib/tool-registry.tsx` | `ToolId` union and `TOOL_REGISTRY` with name, description and component for every tool. |
| `src/lib/layout-config.ts` | Slot order, default hidden slots, the grid tree, layout state shape, reconciliation and persistence. |
| `src/lib/use-layout.ts` | Layout state hook: swap, hide, show, reset, panel sizes, readiness. |
| `src/lib/storage.ts` | The one IndexedDB database. Tool payloads and app-level values. |
| `src/lib/use-tool-state.ts` | The hook every tool uses to persist its state. |
| `src/lib/use-font.ts` | Font size with optional persistence per tool, multiplied by the global font scale. |
| `src/lib/font-scale.ts` | Font scale levels, their percentages and palette commands. Pure, unit tested. |
| `src/lib/use-font-scale.ts` | Global font scale store. Sets `--font-scale` on `<html>`. |
| `src/lib/use-overflow-tooltip.ts` | Finds cut-off text under the pointer inside `[data-overflow-tooltip]` areas. |
| `src/lib/custom-theme.ts` | Custom colors and fonts: defaults, font options, the CSS they produce, readable text on primary. Pure, unit tested. |
| `src/lib/use-custom-theme.ts` | Custom theme store. Writes the `<style id="custom-theme">` element and localStorage. |
| `src/lib/settings-json.ts` | The settings JSON: export with every key, strict parsing, and finding color and font values in the editor's syntax tree. Pure, unit tested. |
| `src/lib/settings-field-widgets.ts` | CodeMirror widgets that put a color swatch or a font ▾ before each pickable value in the settings JSON. |
| `src/lib/use-settings-popover.ts` | Settings popover open state and the "ESC goes back to the palette" rule. |
| `src/components/settings-popover.tsx` | The settings popover under the cog: font size, fonts, theme mode and colors, and the "edit in json" view. It has no backdrop, so changes show on the page while it is open. |
| `src/components/edit-spaces-exit-dialog.tsx` | Asks whether to keep layout changes when ESC leaves edit spaces mode. |
| `src/components/kbd.tsx` | The one keyboard shortcut chip (secondary background). Use it for every shortcut shown in the UI. |
| `src/components/overflow-tooltip.tsx` | The one instant tooltip for cut-off header text, mounted once in `App.tsx`. |
| `src/lib/client-mcp.ts` | Tab side of `@rawgrid/client-mcp`: finds agent sessions on the local ports, connects, registers tools and answers calls. |
| `packages/client-mcp/` | The `@rawgrid/client-mcp` npm package, a Yarn workspace. A stdio MCP server the agent starts, plus a `127.0.0.1` WebSocket the tab connects to. Its README documents the protocol. |
| `src/lib/command-bus.ts` | Tiny pub/sub. Commands are strings, payloads are strings. |
| `src/lib/command-search.ts` | Ranked matcher behind the command palette. |
| `src/components/command-palette.tsx` | The palette and its hard-coded `COMMANDS` list. |
| `src/components/top-navbar.tsx` | Top bar, hover hint, edit mode controls. |
| `src/components/ui/*` | shadcn primitives. `resizable.tsx` wraps react-resizable-panels. |
| `src/components/json-editor.tsx` | CodeMirror editor hard-wired for JSON. |
| `src/tools/<id>/` | One folder per tool. See the blueprint. |
| `src/pages/landing.tsx` | Marketing page with its own `TOOLS` list and icons. |
| `src/index.css` | Theme tokens, dark mode, keyframes, and per-tool CSS such as `.md-doc`. |

## Persistence

There is one database, `rawgrid-tools`, currently version 2, with two stores:

- `tool-state`, keyed by a tool string, holding `{ tool, payload, updatedAt }`. The payload is always a string. One row per key, upserted.
- `app-state`, a key-value store for structured values: the grid layout, the timer run, the timer alarm claim, the video player's `File`, and the md-builder file handle.

Use the hooks and helpers, not idb directly:

- `useToolState({ tool, initialValue, serialize, deserialize })` for anything a tool owns. It hydrates once, debounces writes by 400ms, flushes the pending write on unmount, and never overwrites a value the user edited before hydration finished. `tool: null` disables persistence.
- `readAppState`, `writeAppState`, `deleteAppState` and `subscribeAppState` for app-level values. Writes broadcast to other tabs through a `BroadcastChannel`.
- `readAppStateWithLocalStorageFallback` migrates a legacy localStorage key once, then deletes it.

Theme, font scale and the custom theme are the exceptions. They stay in localStorage because `index.html` reads them before first paint to avoid a flash, and `use-theme-toggle.ts`, `use-font-scale.ts` and `use-custom-theme.ts` are shared external stores so every caller sees the same value. The font scale key is `font-scale` and holds the level, -1 to 5. The custom theme is stored twice: `custom-theme` holds the values and `custom-theme-css` holds the CSS built from them, so `index.html` only has to drop that CSS into a `<style>` element without knowing the format.

Rules:

- `serialize` and `deserialize` must be module-level functions, and object `initialValue`s must be memoized. They are effect dependencies. An inline function re-hydrates on every render.
- `deserialize` must validate every field and fall back to a default. Stored data can be from any older version of the app.
- Keys are free-form strings. Convention is the tool id, with a suffix for secondary values: `md-builder:font-size`, `timer:sound`.
- Bumping the database version needs a migration in the `upgrade` callback in `storage.ts`. Only await IndexedDB requests inside it.

## Grid and layout

- The grid is a tree in `GRID_TREE`. Groups have string ids. Slots are numbered and render as panels with id `slot-N`. Sizes in the tree are percentages used only when nothing is stored.
- Every tool has exactly one slot. `SLOT_COUNT` is the length of `DEFAULT_TOOLS_BY_SLOT`. Adding a tool appends a slot. Saved layouts keep their existing assignments, hidden slots and sizes, and the new tool lands in the new slot. Removed or unknown tools are replaced in place by whichever registered tools are missing. Always append new slots at the end of `DEFAULT_TOOLS_BY_SLOT`, never insert in the middle, or stored assignments shift.
- GitHub Pages serves `index.html` with a 10-minute cache. A reload on `/tools` goes through `public/404.html`, which redirects to `/?/tools` with a timestamp so the browser never reuses a pre-deploy copy; the script in `index.html` strips that timestamp. Keep both in sync.
- Hidden slots are not rendered. The visible siblings are rescaled to fill the group.
- Panel sizes are saved per panel id from `onLayoutChanged` and restored through `defaultLayout` only when every visible panel in the group has a stored size. The library keeps its own in-memory layouts during a session, so reset bumps a `layoutVersion` key to remount the grid.
- The layout hydrates asynchronously. The grid renders only once `isReady` is true.
- Focus mode (`focusedToolId` in the layout state) keeps every tool mounted. The grid container gets `visibility: hidden` and the focused `GridSlot` overrides it back to visible while positioned fixed below the top bar. Escape, the hotkey and the focus mode button exit it. A palette command aimed at another visible tool exits it too, which only works because the other tools stay mounted and keep their command subscriptions.
- The "focus mode" button sits left of "edit spaces" in the top bar and toggles with `⌘⇧F` (`ctrl⇧F` elsewhere). Entering focuses the last hovered tool, or the first visible one. The button uses `FocusIcon` in `src/components/focus-icon.tsx`, the lucide focus glyph with a slash variant for exit.
- Focusing a hidden tool does not unhide it. Its slot is rendered only while it is focused (see `isNodeVisible` in `App.tsx`), and panel size changes are not persisted while any tool is focused, so the extra panel never pollutes the saved sizes.
- In focus mode a `FocusTabs` strip sits above the focused slot, listing every visible tool. The slot's fixed top offset is `focusTop + FOCUS_TABS_HEIGHT`, so change both together.
- ESC in edit spaces mode exits it. If spaces were moved, hidden or shown since entering, it asks first: keep changes, discard (restores the layout from when edit mode started) or keep editing. The "done" button always keeps changes.
- The palette has one "focus <tool>" command per tool, generated from the registry, plus "exit focus mode". Commands can carry a fixed `payload`, which is how those entries pass the tool id.

## Hotkeys aimed at a tool

`src/lib/tool-hover.ts` holds the commands that target one tool. `App.tsx` sends them with the tool id as the payload: the hovered tool, or the focused tool in focus mode. Each tool subscribes and ignores ids that are not its own.

- `⌘⇧+` and `⌘⇧-` send `FONT_COMMANDS`. `useFont` handles them.
- `⌘S` sends `SAVE_COMMAND`. Only md-builder handles it today. `App.tsx` always blocks the browser's "save page" dialog on the tools page, even when no tool saves.
- Use `hasModKey` and `MOD_KEY_LABEL` from `src/lib/utils.ts` for `⌘` on macOS and `ctrl` elsewhere.

## MD Builder live mode

- **Transport.** The agent starts `@rawgrid/client-mcp` over stdio. md builder connects to it over `ws://127.0.0.1:47821–47830` and registers the tools in `LIVE_TOOLS` (`constants.ts`). `use-live-mode.ts` owns the connection. Scanning starts only after the user opens the live panel or has connected before, so a fresh visitor never gets Chrome's local network prompt. Once enabled, it connects on its own only when exactly one free session has `isAgentActive` (the server's `lastAgentCallAt` is set). Every agent process loads the MCP config, including Claude Code's `claude bg-spare` background processes, which have no terminal and never call rawgrid, so idle sessions are only connected by hand. The exception is the session the user last connected to (`md-builder:live-session`), which is reconnected after a reload even while idle. Connected is not the same as engaged: every connect resets `agentStatus`, and until the agent calls this connection, the UI shows "waiting for" with a hollow dot. `isAgentActive` only means the session has ever used rawgrid, so it drives auto-connect, not the live indicator. The server also reports `host` (from `ps` ancestry: background daemon, an app's terminal, or unknown), and the panel orders sessions with `orderSessions` and labels them with `sessionHostLabel` and `timeSince`.
- **One writer.** Only md builder writes the `.md` file. Agent calls change the document through `applyAgentCall` in `live-sync.ts`, and each applied call is written to disk straight away (`queueDiskWrite`), unless the file changed on disk, in which case the usual "changed on disk" button shows.
- **Published and pending.** `syncRef` in `use-md-builder.ts` holds the published document (what the agent sees and the disk holds), the user's unsaved ops, and the activity log. While nothing is pending, `published` is `null` and means "same as the view". Every user edit goes through `commitUserOp`, so it is recorded as an op. Agent changes apply to the published document, and the pending ops are replayed on top with `rebasePending`. Ops that no longer apply land in `droppedNotes` with a reason.
- **Live mode posts each change.** While connected, `commitUserOp` publishes every op right away and writes the file, so the agent hears about each comment as soon as it is posted. `publish()` turns pending ops into user events in the log and wakes every `wait_for_activity` call. Ops made before connecting stay pending until `⌘S`, which publishes even without a file handle.
- **Rules live in `live-sync.ts` and are pure.** Every rejection has a reason the agent can act on (`unknown_thread`, `thread_resolved`, `new_activity`, `not_found`, `ambiguous`, `overlaps_thread`, `contains_markup`, `crosses_block`, `empty_text`). `live-sync.test.ts` includes an interleaving fuzz test; add a case there for any new rule.
- **Thread ids** are `t<id>` and stay unique within a session. A refresh numbers the reloaded threads after the current `nextId`, so an agent holding an old id gets `unknown_thread` instead of hitting a different thread.
- **New-note styling must not mix the two user colors.** Primary and secondary can be any combination, so the highlight dims every non-new note in the sidebar while anything is new (`text-muted-foreground`), fills the reply marker, flashes a foreground wash once (`md-arrive`) and shows a dot mixed from primary and a fixed red (`md-unread-dot`). No backgrounds built from secondary.
- **New notes.** Keys come from `noteKeyFor` (quote, first note, note index), not from thread ids, so they survive a page reload. A refresh replaces the set with `addedNoteKeys(before, after)`. In live mode the first agent reply or comment after a save replaces the set, and later ones in the same round add to it.
- **Agent notes** are stored with an `agent:` prefix, which `authorOf` reads back as the author.
- **Note times live in the note.** A note may end with `<!--rg:<ISO time>-->`. `splitNoteTime` reads it, `withNoteTime` writes it, and agent text has any marker stripped before md builder adds its own. Display and edit always use the split text. Notes render through `renderMarkdown` as `.md-doc.md-note`.
- **`renderMarkdown` refuses unsafe link targets.** `javascript:`, `vbscript:` and `data:` links (ignoring case and control characters) render as their text. Keep it that way: notes from agents go through the same renderer.
- **Only the user resolves threads.** The agent has `apply_change` (rewrite a thread's quoted text, thread stays open) but no resolve tool, and the brief and live prompt say so. Resolving is the user op `resolve`; reopening is `restore`, placed with `reopenRange`. Resolved threads are kept per document name in the `md-builder:resolved` tool state and shown in the sidebar's resolved tab.
- **Reloads change seq and ids.** Each page load starts `seq` at `Date.now()` (`firstSeq`). A `wait_for_activity` with an older `sinceSeq` returns `reloaded: true`, and an `apply_change` with an older `baseSeq` is rejected as `stale_seq`, so the agent re-reads thread ids instead of writing to the wrong thread.
- **Connecting publishes.** `useLiveMode` calls `onConnected`, which publishes unsaved ops so the agent's view matches the user's.
- **Placeholder replies.** `publish()` records each thread the user commented, replied or edited in (`pendingReplySeqs`, thread id → event seq) while live. The thread renders a `PendingAgentNote` in the slot keyed `notes.length`, which is exactly the key the agent's real reply will get, so React reuses the element and only the text changes. Entries clear when the agent replies there, when the user resolves the thread, or when the agent calls `wait_for_activity` with a `sinceSeq` past that event. The placeholder's entrance waits `PENDING_REPLY_DELAY_S`.
- **The server's tool list is stable.** `advertise()` only announces a change when a tab registers a different set of tools, and the last set stays listed while the tab is away. Removing tools during a reload made agents conclude md builder was gone and stop.
- **Engaged decays.** `handleAgentCall` counts calls in flight; when none are left, `isAgentAway` turns on after `agentAwayMs` (2 minutes), and the UI goes back to "waiting for" with an "isn't listening" hint.
- **Agent status** comes from the calls themselves: `wait_for_activity` shows "waiting", other calls show "thinking", and `set_status` shows the agent's own words. It never sees the model's reasoning; MCP only sees tool calls.
- **Discovery uses `fetch`, not WebSockets.** Chrome lets only one WebSocket per host be connecting at a time, and refused ports take seconds, so scanning ten ports with sockets timed out. The server answers `GET /hello` for allowed origins; the tab probes with a `no-cors` fetch, then `/hello`, and falls back to a socket greeting for 0.1.0 servers.
- **Comment animations** use `motion` (`motion/react`) with `COMMENT_MOTION` from `constants.ts` (circOut, 0.175s). `COMMENT_SCROLL_DELAY_MS` waits for it before auto-scrolling, so change both together. Lists render inside `AnimatePresence initial={false}` so nothing animates on first render or tab switch.

## Command palette

`COMMANDS` is a hard-coded list. `rankCommands` in `command-search.ts` scores each whitespace token against group words and label words: whole word beats prefix, group beats label, substring and single-word fuzzy subsequence come last, and earlier tokens weigh more. "md play" therefore lists the md builder commands before timer play. Tokens under three characters never fuzzy-match. `toolForCommand` maps a command prefix to a tool id for the focus rule, so a new tool's command prefix must be added to `TOOL_BY_COMMAND_PREFIX`.

## Blueprint for a new tool

1. Create `src/tools/<id>/<id>.tsx` exporting `<Pascal>Tool`. Components only render. Put small private subcomponents below the main export in the same file.
2. Create `src/tools/<id>/lib/`:
   - `constants.ts`: a config interface plus an `UPPER_SNAKE` config object, option lists, defaults, and every user-facing string in an `as const` object.
   - `use-<id>.ts`: all state, effects and persistence. Returns `{ state, ...handlers }` with `state` typed as `<Pascal>State`.
   - `use-<id>-commands.ts`: `use<Pascal>WithCommands()` wraps the base hook and subscribes to command-bus strings in an effect with no dependency array, returning the unsubscribe functions.
   - `utils.ts`: pure functions. This is what gets unit tests.
3. Import the commands hook into the component under the base name: `import { useXWithCommands as useX } from "@/tools/x/lib/use-x-commands"`.
4. Register it in `src/lib/tool-registry.tsx`: extend `ToolId`, import the component, add `{ name, description, component }`. `name` is Title Case, `description` is a short lowercase phrase shown in the top bar on hover.
5. Add the id to `DEFAULT_TOOLS_BY_SLOT` and a `{ kind: "slot", slot: N, size, minSize }` node in `GRID_TREE`. Add `N` to `DEFAULT_HIDDEN_SLOTS` to hide it by default.
6. Add entries to `COMMANDS` in `command-palette.tsx`. Ids are `<id>-<action>`, command strings are `<id>:<action>`, labels and groups are lowercase.
7. Add a card to `TOOLS` in `src/pages/landing.tsx` with a lucide icon, and a row to the README table.
8. The tool fills a panel. Its root is `flex h-full w-full flex-col`, usually with `overflow-hidden`. The header bar is `h-8 border-b border-border px-1 gap-1` with `data-overflow-tooltip`, starting with `ToolInfo` and ending with `FontSizeButtons` in an `ml-auto` span. Meta labels are `font-mono text-10 text-muted-foreground`. Error strips are `bg-destructive/10 text-destructive`. All UI copy is lowercase.

Style rules that apply everywhere:

- Never size text in raw pixels such as `text-[10px]`. Use the Tailwind sizes or `text-10`, `text-11` and `text-13`. Those tokens are multiplied by `--font-scale` in `index.css`; a raw pixel size ignores the user's font scale. A per-tool font size from `useFont` is already scaled.
- Tool header bars carry `data-overflow-tooltip`. To let a header label shrink, give the item `min-w-0 shrink` and put its text in a `truncate` span. Buttons are `shrink-0` by default. Cut-off text in the area then shows its full text in an instant tooltip.

- No code comments. Names carry the meaning.
- Named exports only. Files and folders are kebab-case. Imports use `@/` paths and are ordered React, third party, `@/components`, `@/lib`, `@/tools`.
- `.tsx` files export only components. Hooks and constants live in `.ts` files, or Fast Refresh breaks.
- Never import `react-resizable-panels` directly. Use `@/components/ui/resizable`.
- Numeric sizes on `ResizablePanel` are pixels in v4. Always pass strings like `"50%"`.
- Give every `ResizablePanelGroup` an `id` if its sizes should ever be persisted.

## Gotchas

- **React 19 and `dangerouslySetInnerHTML`.** The prop is compared by object identity, so `{ __html: html }` created inline resets innerHTML on every render. That destroys the live selection and any classes you added to the DOM. Memoize the object on the string.
- **Hidden tabs.** `requestAnimationFrame` and CSS animation events do not fire while a tab is hidden. Anything that must complete, such as removing a transient class, needs a timer fallback. The top bar hint exit uses a timeout for this reason.
- **The grid remounts tools.** Swapping, hiding, showing, and leaving `/tools` all unmount tool components. Pending writes are flushed by `useToolState`, but anything in plain `useState` is lost, and command-bus subscriptions of unmounted tools are gone, so dispatching to a hidden tool does nothing.
- **Hydration race.** A user can type or a command can arrive before IndexedDB answers. `useToolState` keeps the edit. If you build your own hydration, track whether the value was edited before applying stored data.
- **Empty values are values.** A stored empty string must round-trip as empty. Do not use `value || DEFAULT` in a deserializer unless empty should really mean default.
- **Selection to source mapping.** The md-builder renderer tags every text span with `data-s` and `data-e` source offsets. Any new inline markup must keep producing those spans or selections stop mapping.
- **CriticMarkup must stay inside a block.** A comment range that crosses a paragraph boundary is not valid CriticMarkup and will not parse back.
- **Point markers sit at an exact offset.** The span renderer splits text at point positions. If you emit points only at span starts, end-of-line comments land at the bottom of the document.
- **Adjacent point comments merge.** `{==a==}{>>n1<<}{>>n2<<}` can only parse as one thread, so a point comment that starts exactly where the previous comment's notes end is ambiguous by the spec. The UI never creates one, since point comments only come from files. The fuzz test generator avoids it on purpose.
- **A comment covering only markdown syntax has no text to highlight.** The renderer appends a fallback marker at the end of the document for any comment that produced no span, so its card still has an anchor.
- **Comments in the sidebar are keyed by `data-c`.** The document, the cards and the minimap all look up a comment by that attribute. Keep it on anything that represents a comment.
- **Custom theme CSS must beat the defaults without fighting the mode.** Colors are written under `html:not(.dark)` and `html.dark`, which outrank `:root` and `.dark` in `index.css` while staying mode-exclusive. A plain `:root` override would leak a light color into dark mode. Fonts go on `:root:root` through `--font-ui` and `--font-code`, which `--font-sans` and `--font-mono` point at.
- **The settings JSON is strict on purpose.** Unknown keys and bad values are listed with their path and nothing is applied. Missing keys mean the default. A new setting needs a key in `settings-json.ts`, a test, and, if it is a color or font, a path in `fieldForPath` so the editor shows a picker for it.
- **ESC is shared.** `isPageEscape` in `utils.ts` ignores ESC from inputs and from anything inside a dialog, so the focus mode and edit spaces handlers never fire under a modal. Base UI does not mark ESC as handled.
- **`cn()` drops font size tokens it does not know.** tailwind-merge reads `text-11` as a text color, so `cn("text-11 text-muted-foreground")` silently loses the size. Every custom `--text-*` token in `index.css` must also be listed under `theme.text` in `src/lib/utils.ts`.
- **Lint has pre-existing failures** in `tool-registry.tsx` (non-component export), `use-json-search.ts` (setState in effect) and three shadcn files. Do not fix them as a side effect of other work. Lint the files you touched.
- **Two timers for the timer tool.** The entered duration is tool state. The running countdown is app state so other tabs can follow it. Keep them separate.
- **File handles are structured-cloneable.** `FileSystemFileHandle` and `File` can be stored in `app-state` directly. Permission to read a stored handle must be re-requested after a reload.
- **The build base path is `/rawgrid-client/`.** Dev server URLs include it.
- **The repo root is a Yarn workspace root.** `packages/*` are workspaces. The app itself stays the root package, so `yarn dev`, `yarn build` and the Pages deploy are unchanged. Vitest runs `packages/*/src/**/*.test.ts` too.
- **zod 4 `discriminatedUnion` needs unique discriminator values.** Two `result` shapes under one `type` made every message fail to parse. The client-mcp protocol uses `z.union` for that reason.
- **Live tool calls must answer within 120 seconds**, the server's call timeout. `wait_for_activity` is capped at 50 seconds for that reason, and the agent is told to call it again.
