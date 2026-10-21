import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import type { Bridge } from "./bridge.js";
import type { CallOutcome } from "./protocol.js";

export const SERVER_INFO = { name: "rawgrid", version: "0.1.4" } as const;

const BUILT_IN_TOOLS = {
  status: "client_status",
  list: "list_client_tools",
  call: "call_client_tool",
} as const;

const BUILT_IN_TOOL_NAMES: readonly string[] = Object.values(BUILT_IN_TOOLS);

function instructionsFor(bridge: Bridge) {
  const { id, cwd } = bridge.session();
  return [
    "This server connects you to a rawgrid browser tab, such as md builder. The tab offers its own tools once the user connects it.",
    `If ${BUILT_IN_TOOLS.status} says no tab is connected, ask the user to open md builder in rawgrid, click live, and connect to session ${id} (${cwd}).`,
    `If the tab's tools do not show up in your tool list, use ${BUILT_IN_TOOLS.list} and ${BUILT_IN_TOOLS.call} instead.`,
  ].join(" ");
}

function builtInTools(): Tool[] {
  return [
    {
      name: BUILT_IN_TOOLS.status,
      description:
        "Shows whether a rawgrid tab is connected to this session, which tools it offers, and how the user connects one.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: BUILT_IN_TOOLS.list,
      description:
        "Lists the tools the connected rawgrid tab offers, with their input schemas. Use it only if those tools are missing from your tool list.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: BUILT_IN_TOOLS.call,
      description:
        "Calls one of the connected rawgrid tab's tools by name. Use it only if that tool is missing from your tool list.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          arguments: { type: "object" },
        },
        required: ["name"],
      },
    },
  ];
}

function textResult(value: unknown, isError = false): CallToolResult {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }], isError };
}

function outcomeResult(outcome: CallOutcome): CallToolResult {
  return outcome.ok
    ? textResult(outcome.value)
    : textResult(outcome.error, true);
}

function statusOf(bridge: Bridge) {
  const session = bridge.session();
  return {
    session: { id: session.id, cwd: session.cwd },
    port: bridge.port,
    connected: bridge.isConnected(),
    client: bridge.clientName(),
    tools: bridge.tools().map((tool) => tool.name),
    howToConnect: bridge.isConnected()
      ? null
      : `open md builder in rawgrid, click live, and connect to session ${session.id} (${session.cwd}).`,
  };
}

function tabTools(bridge: Bridge): Tool[] {
  return bridge
    .tools()
    .filter((tool) => !BUILT_IN_TOOL_NAMES.includes(tool.name))
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: { type: "object", ...tool.inputSchema } as Tool["inputSchema"],
      ...(tool.annotations ? { annotations: tool.annotations as Tool["annotations"] } : {}),
    }));
}

export function createMcpServer(bridge: Bridge) {
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: { listChanged: true } },
    instructions: instructionsFor(bridge),
  });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [...builtInTools(), ...tabTools(bridge)],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    bridge.markAgentCall();
    const { name } = request.params;
    const args = request.params.arguments ?? {};
    if (name === BUILT_IN_TOOLS.status) return textResult(statusOf(bridge));
    if (name === BUILT_IN_TOOLS.list) return textResult(tabTools(bridge));
    if (name === BUILT_IN_TOOLS.call) {
      const target = typeof args.name === "string" ? args.name : "";
      const targetArgs =
        args.arguments && typeof args.arguments === "object"
          ? (args.arguments as Record<string, unknown>)
          : {};
      return outcomeResult(await bridge.callTool(target, targetArgs));
    }
    return outcomeResult(await bridge.callTool(name, args));
  });

  server.oninitialized = () => {
    const client = server.getClientVersion();
    if (client) bridge.setAgent({ name: client.name, version: client.version });
  };

  bridge.onToolsChanged(() => {
    void server.sendToolListChanged().catch(() => undefined);
  });

  return server;
}
