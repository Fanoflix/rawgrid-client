# @rawgrid/client-mcp

Lets a browser tab offer MCP tools to an agent running on your machine, such as Claude Code, Codex or Cursor. [rawgrid](https://fanoflix.github.io/rawgrid-client/)'s md builder uses it for live mode: your agent reads the document you are reviewing and answers each comment as soon as you post it.

There is no hosted server and nothing is written to your project folders. Your agent starts this package itself, as an ordinary MCP server.

## How it works

```
agent ──stdio──► @rawgrid/client-mcp ──ws://127.0.0.1:47821–47830──► browser tab
```

1. Your agent starts the server over stdio when its session starts.
2. The server listens for the tab on `127.0.0.1`, on the first free port from 47821 to 47830, so several agent sessions can run at once.
3. The tab finds the server, the user clicks connect, and the tab sends the list of tools it offers.
4. The server tells the agent its tool list changed. Each tool call goes to the tab, and the tab's answer comes back as the tool result.

If the tab is not connected, for example while the page reloads, a call waits up to 30 seconds for it to come back before failing. The tab's tools stay listed while it is away, and the agent is only told the tool list changed when a tab registers a different set, so a reload never makes tools disappear. A call cut off by a disconnect is sent again only if the tool is marked read-only (`annotations.readOnlyHint: true`). Any other tool reports that its change may or may not have been applied, because the tab might have applied it before the connection dropped.

Every agent process that loads your MCP config starts this server, including idle ones such as Claude Code's pre-warmed background sessions. So tabs should connect on their own only to sessions with a non-null `lastAgentCallAt`, meaning the agent has actually started using rawgrid.

Tabs find sessions with `GET http://127.0.0.1:<port>/hello`, which answers allowed origins with the same hello message the WebSocket sends. Browsers fail fast on closed ports with `fetch`, while WebSocket attempts are queued and slow.

Until a tab connects, the agent only sees three tools:

| Tool | What it does |
| --- | --- |
| `client_status` | Says whether a tab is connected, which tools it offers, and how the user connects one. |
| `list_client_tools` | Lists the tab's tools. For agents that ignore tool list changes. |
| `call_client_tool` | Calls one of the tab's tools by name. For agents that ignore tool list changes. |

## Set up

Claude Code:

```bash
claude mcp add --scope user rawgrid -- npx -y @rawgrid/client-mcp@latest
```

Optionally, in Claude Code run `/permissions` and add an allow rule for `mcp__rawgrid`. Long sessions then never stop for a permission prompt or an auto-mode block on rawgrid's tools.

`@latest` makes npx check for a new version each time the agent starts, instead of reusing a cached copy, so the server keeps up with the rawgrid page. `--scope user` makes it available in every project. Without it, Claude Code adds the server only to the project you ran the command in.

Codex:

```bash
codex mcp add rawgrid -- npx -y @rawgrid/client-mcp@latest
```

Cursor, in `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "rawgrid": { "command": "npx", "args": ["-y", "@rawgrid/client-mcp@latest"] } } }
```

Then open md builder in rawgrid at [fanoflix.github.io/rawgrid-client/tools](https://fanoflix.github.io/rawgrid-client/tools), click **live**, and paste the prompt from the live panel into your agent. md builder connects to the agent's session on its own once the agent starts using rawgrid.

## Security

- The server listens on `127.0.0.1` only, never on your network.
- It accepts a WebSocket only when the `Origin` header is `https://fanoflix.github.io` or the local dev server (`http://localhost:5173`, `http://127.0.0.1:5173`). Browsers set `Origin` themselves, so other websites cannot connect. Add more with `--allow-origin <origin>`.
- It also checks the `Host` header, which blocks DNS rebinding.
- One tab at a time. A second tab that connects takes over and the first one is told.

## Protocol

All messages are JSON over the WebSocket.

Server to tab:

| Message | When |
| --- | --- |
| `{ type: "hello", protocol: "rawgrid-client-mcp", version: 1, session, isTaken }` | Right after the tab connects. `session` has `id`, `cwd`, `pid`, `startedAt`, `agent` (`{ name, version }` once the agent has said hello) `lastAgentCallAt` (when the agent last called any rawgrid tool, or `null`) and `host` (`{ kind: "terminal" | "background" | "unknown", app }`, found by walking the process's ancestors with `ps`, so a tab can tell a terminal session from a background one). |
| `{ type: "session", session, isTaken }` | Whenever the session or its owner changes. |
| `{ type: "call", id, tool, args }` | The agent called one of the tab's tools. |
| `{ type: "replaced" }` | Another tab took over. |

Tab to server:

| Message | When |
| --- | --- |
| `{ type: "register", client: { name }, tools: [{ name, description, inputSchema, annotations? }] }` | To take the session and offer tools. Tools use the same shape as MCP and WebMCP. Set `annotations.readOnlyHint` on tools that only read, so they are retried after a reconnect. |
| `{ type: "result", id, ok: true, value }` or `{ type: "result", id, ok: false, error }` | The answer to a call. Errors reach the agent as tool errors. |

A call times out after 120 seconds, so a tab tool that waits must return before then.

## Develop

```bash
yarn workspace @rawgrid/client-mcp build
claude mcp add rawgrid --scope user -- node "$(pwd)/packages/client-mcp/dist/cli.js"
```

Use `--scope user`. Without it, Claude Code adds the server only to the project you ran the command in, and sessions in other projects won't see it. Rebuild after changing the package and start a new agent session to pick it up.

Tests run with the rest of the repo: `yarn test`.
