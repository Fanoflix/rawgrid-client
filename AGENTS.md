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
| `src/lib/use-font.ts` | Font size with optional persistence per tool. |
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

Theme is the one exception. It stays in localStorage because `index.html` reads it before first paint to avoid a flash, and `use-theme-toggle.ts` is a shared external store so every caller sees the same value.

Rules:

- `serialize` and `deserialize` must be module-level functions, and object `initialValue`s must be memoized. They are effect dependencies. An inline function re-hydrates on every render.
- `deserialize` must validate every field and fall back to a default. Stored data can be from any older version of the app.
- Keys are free-form strings. Convention is the tool id, with a suffix for secondary values: `md-builder:font-size`, `timer:sound`.
- Bumping the database version needs a migration in the `upgrade` callback in `storage.ts`. Only await IndexedDB requests inside it.

## Grid and layout

- The grid is a tree in `GRID_TREE`. Groups have string ids. Slots are numbered and render as panels with id `slot-N`. Sizes in the tree are percentages used only when nothing is stored.
- Every tool has exactly one slot. `SLOT_COUNT` is the length of `DEFAULT_TOOLS_BY_SLOT`. Adding a tool changes the count and resets every user's saved layout to the default once. That is accepted.
- Hidden slots are not rendered. The visible siblings are rescaled to fill the group.
- Panel sizes are saved per panel id from `onLayoutChanged` and restored through `defaultLayout` only when every visible panel in the group has a stored size. The library keeps its own in-memory layouts during a session, so reset bumps a `layoutVersion` key to remount the grid.
- The layout hydrates asynchronously. The grid renders only once `isReady` is true.
- Focus mode (`focusedToolId` in the layout state) keeps every tool mounted. The grid container gets `visibility: hidden` and the focused `GridSlot` overrides it back to visible while positioned fixed below the top bar. Escape, the hotkey and the focus mode button exit it. A palette command aimed at another visible tool exits it too, which only works because the other tools stay mounted and keep their command subscriptions.
- The "focus mode" button sits left of "edit spaces" in the top bar and toggles with `⌘⇧F` (`ctrl⇧F` elsewhere). Entering focuses the last hovered tool, or the first visible one. The button uses `FocusIcon` in `src/components/focus-icon.tsx`, the lucide focus glyph with a slash variant for exit.
- Focusing a hidden tool does not unhide it. Its slot is rendered only while it is focused (see `isNodeVisible` in `App.tsx`), and panel size changes are not persisted while any tool is focused, so the extra panel never pollutes the saved sizes.
- In focus mode a `FocusTabs` strip sits above the focused slot, listing every visible tool. The slot's fixed top offset is `focusTop + FOCUS_TABS_HEIGHT`, so change both together.
- The palette has one "focus <tool>" command per tool, generated from the registry, plus "exit focus mode". Commands can carry a fixed `payload`, which is how those entries pass the tool id.

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
8. The tool fills a panel. Its root is `flex h-full w-full flex-col`, usually with `overflow-hidden`. The header bar is `h-8 border-b border-border px-1 gap-1` starting with `ToolInfo` and ending with `FontSizeButtons` in an `ml-auto` span. Meta labels are `font-mono text-[10px] text-muted-foreground`. Error strips are `bg-destructive/10 text-destructive`. All UI copy is lowercase.

Style rules that apply everywhere:

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
- **Lint has pre-existing failures** in `tool-registry.tsx` (non-component export), `use-json-search.ts` (setState in effect) and three shadcn files. Do not fix them as a side effect of other work. Lint the files you touched.
- **Two timers for the timer tool.** The entered duration is tool state. The running countdown is app state so other tabs can follow it. Keep them separate.
- **File handles are structured-cloneable.** `FileSystemFileHandle` and `File` can be stored in `app-state` directly. Permission to read a stored handle must be re-requested after a reload.
- **The build base path is `/rawgrid-client/`.** Dev server URLs include it.
