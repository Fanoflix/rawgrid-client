#!/usr/bin/env node
import { parseArgs } from "node:util";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { startBridge } from "./bridge.js";
import { createMcpServer } from "./mcp-server.js";
import { DEFAULT_ALLOWED_ORIGINS, PORT_RANGE } from "./protocol.js";

const { values } = parseArgs({
  options: {
    "allow-origin": { type: "string", multiple: true },
  },
});

const bridge = await startBridge({
  ports: PORT_RANGE,
  allowedOrigins: [...DEFAULT_ALLOWED_ORIGINS, ...(values["allow-origin"] ?? [])],
  cwd: process.cwd(),
});

const server = createMcpServer(bridge);
const transport = new StdioServerTransport();

let isShuttingDown = false;
async function shutDown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  await bridge.close();
  process.exit(0);
}

transport.onclose = () => void shutDown();
process.stdin.on("end", () => void shutDown());
process.on("SIGINT", () => void shutDown());
process.on("SIGTERM", () => void shutDown());

await server.connect(transport);

const { id } = bridge.session();
process.stderr.write(
  `rawgrid client-mcp: session ${id} listening on ws://127.0.0.1:${bridge.port}\n`
);
