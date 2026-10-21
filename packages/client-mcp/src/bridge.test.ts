import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { get } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { startBridge, type Bridge } from "./bridge.js";
import { createMcpServer } from "./mcp-server.js";
import type { ServerMessage } from "./protocol.js";

const ORIGIN = "http://localhost:5173";
const ECHO_TOOL = {
  name: "echo",
  description: "returns its input",
  inputSchema: { type: "object", properties: { text: { type: "string" } } },
};
const READ_TOOL = { ...ECHO_TOOL, name: "read", annotations: { readOnlyHint: true } };

const openBridges: Bridge[] = [];
const openSockets: WebSocket[] = [];

afterEach(async () => {
  openSockets.splice(0).forEach((socket) => socket.terminate());
  await Promise.all(openBridges.splice(0).map((bridge) => bridge.close()));
});

async function bridgeOnFreePort(callTimeoutMs = 2000, reconnectGraceMs = 100) {
  const bridge = await startBridge({
    ports: { first: 47900, last: 47960 },
    allowedOrigins: [ORIGIN],
    cwd: "/tmp/project",
    callTimeoutMs,
    reconnectGraceMs,
  });
  openBridges.push(bridge);
  return bridge;
}

interface TestTab {
  socket: WebSocket;
  messages: ServerMessage[];
  next: (type: ServerMessage["type"]) => Promise<ServerMessage>;
}

function connectTab(port: number, origin = ORIGIN) {
  return new Promise<TestTab>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin });
    openSockets.push(socket);
    const messages: ServerMessage[] = [];
    const waiters: Array<{ type: string; resolve: (message: ServerMessage) => void }> = [];
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      const waiterIndex = waiters.findIndex((waiter) => waiter.type === message.type);
      if (waiterIndex >= 0) {
        waiters.splice(waiterIndex, 1)[0].resolve(message);
        return;
      }
      messages.push(message);
    });
    function next(type: ServerMessage["type"]) {
      const queuedIndex = messages.findIndex((message) => message.type === type);
      if (queuedIndex >= 0) return Promise.resolve(messages.splice(queuedIndex, 1)[0]);
      return new Promise<ServerMessage>((resolveNext) => waiters.push({ type, resolve: resolveNext }));
    }
    socket.on("open", () => resolve({ socket, messages, next }));
    socket.on("error", reject);
  });
}

function register(tab: TestTab, tools = [ECHO_TOOL]) {
  tab.socket.send(JSON.stringify({ type: "register", client: { name: "md builder" }, tools }));
}

function answerCalls(tab: TestTab) {
  tab.socket.on("message", (data) => {
    const message = JSON.parse(data.toString()) as ServerMessage;
    if (message.type !== "call") return;
    tab.socket.send(JSON.stringify({ type: "result", id: message.id, ok: true, value: message.args }));
  });
}

async function connectedAgent(bridge: Bridge) {
  const server = createMcpServer(bridge);
  const client = new Client({ name: "test-agent", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function getHello(port: number, origin: string) {
  return new Promise<{ status: number; body: string; allowOrigin: string | undefined }>((resolve, reject) => {
    get(
      { host: "127.0.0.1", port, path: "/hello", headers: { origin } },
      (response) => {
        let body = "";
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 0,
            body,
            allowOrigin: response.headers["access-control-allow-origin"] as string | undefined,
          })
        );
      }
    ).on("error", reject);
  });
}

describe("bridge", () => {
  it("answers GET /hello for allowed origins so tabs can find sessions without opening sockets", async () => {
    const bridge = await bridgeOnFreePort();
    const allowed = await getHello(bridge.port, ORIGIN);
    expect(allowed.status).toBe(200);
    expect(allowed.allowOrigin).toBe(ORIGIN);
    expect(JSON.parse(allowed.body)).toMatchObject({
      type: "hello",
      session: { id: bridge.session().id },
      isTaken: false,
    });
    const refused = await getHello(bridge.port, "https://evil.example");
    expect(refused.status).toBe(403);
    expect(refused.allowOrigin).toBeUndefined();
  });

  it("greets a tab from an allowed origin with the session", async () => {
    const bridge = await bridgeOnFreePort();
    const tab = await connectTab(bridge.port);
    const hello = await tab.next("hello");
    expect(hello).toMatchObject({
      protocol: "rawgrid-client-mcp",
      session: { id: bridge.session().id, cwd: "/tmp/project" },
      isTaken: false,
    });
  });

  it("refuses tabs from other origins", async () => {
    const bridge = await bridgeOnFreePort();
    await expect(connectTab(bridge.port, "https://evil.example")).rejects.toThrow();
  });

  it("forwards calls to the registered tab and returns its answer", async () => {
    const bridge = await bridgeOnFreePort();
    const tab = await connectTab(bridge.port);
    answerCalls(tab);
    register(tab);
    await tab.next("session");
    await expect(bridge.callTool("echo", { text: "hi" })).resolves.toEqual({
      ok: true,
      value: { text: "hi" },
    });
  });

  it("explains how to connect when no tab is registered", async () => {
    const bridge = await bridgeOnFreePort();
    const outcome = await bridge.callTool("echo", {});
    expect(outcome.ok).toBe(false);
  });

  it("waits for a tab that connects after the call was made", async () => {
    const bridge = await bridgeOnFreePort(2000, 2000);
    const pending = bridge.callTool("echo", { text: "late" });
    const tab = await connectTab(bridge.port);
    answerCalls(tab);
    register(tab);
    await expect(pending).resolves.toEqual({ ok: true, value: { text: "late" } });
  });

  it("retries a read-only call on the tab that reconnects", async () => {
    const bridge = await bridgeOnFreePort(2000, 2000);
    const first = await connectTab(bridge.port);
    register(first, [READ_TOOL]);
    await first.next("session");
    const pending = bridge.callTool("read", { text: "again" });
    await first.next("call");
    first.socket.close();
    const second = await connectTab(bridge.port);
    answerCalls(second);
    register(second, [READ_TOOL]);
    await expect(pending).resolves.toEqual({ ok: true, value: { text: "again" } });
  });

  it("does not retry a change cut off by a disconnect and says it may have applied", async () => {
    const bridge = await bridgeOnFreePort(2000, 2000);
    const first = await connectTab(bridge.port);
    register(first);
    await first.next("session");
    const pending = bridge.callTool("echo", {});
    await first.next("call");
    first.socket.close();
    const outcome = await pending;
    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error).toContain("may or may not have been applied");
  });

  it("fails a pending call when the tab disconnects", async () => {
    const bridge = await bridgeOnFreePort();
    const tab = await connectTab(bridge.port);
    register(tab);
    await tab.next("session");
    const pending = bridge.callTool("echo", {});
    await tab.next("call");
    tab.socket.close();
    await expect(pending).resolves.toMatchObject({ ok: false });
    expect(bridge.isConnected()).toBe(false);
  });

  it("hands the session to the newest tab and tells the old one", async () => {
    const bridge = await bridgeOnFreePort();
    const first = await connectTab(bridge.port);
    register(first);
    await first.next("session");
    const second = await connectTab(bridge.port);
    expect(await second.next("hello")).toMatchObject({ isTaken: true });
    register(second);
    expect(await first.next("replaced")).toEqual({ type: "replaced" });
  });

  it("times out a call the tab never answers", async () => {
    const bridge = await bridgeOnFreePort(50);
    const tab = await connectTab(bridge.port);
    register(tab);
    await tab.next("session");
    await expect(bridge.callTool("echo", {})).resolves.toMatchObject({ ok: false });
  });

  it("uses the next port when the first is taken", async () => {
    const first = await bridgeOnFreePort();
    const second = await bridgeOnFreePort();
    expect(second.port).toBeGreaterThan(first.port);
  });
});

describe("mcp server", () => {
  it("lists only the built-in tools until a tab registers, then announces the change", async () => {
    const bridge = await bridgeOnFreePort();
    const client = await connectedAgent(bridge);
    const before = await client.listTools();
    expect(before.tools.map((tool) => tool.name)).toEqual([
      "client_status",
      "list_client_tools",
      "call_client_tool",
    ]);

    const changed = new Promise<void>((resolve) =>
      client.setNotificationHandler(ToolListChangedNotificationSchema, () => resolve())
    );
    const tab = await connectTab(bridge.port);
    answerCalls(tab);
    register(tab);
    await changed;

    const after = await client.listTools();
    expect(after.tools.map((tool) => tool.name)).toContain("echo");
    const result = await client.callTool({ name: "echo", arguments: { text: "hello" } });
    expect(result.isError).toBe(false);
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify({ text: "hello" }, null, 2) }]);
  });

  it("tells tabs once the agent has started calling rawgrid tools", async () => {
    const bridge = await bridgeOnFreePort();
    const client = await connectedAgent(bridge);
    expect(JSON.parse((await getHello(bridge.port, ORIGIN)).body).session.lastAgentCallAt).toBeNull();
    await client.callTool({ name: "client_status", arguments: {} });
    expect(JSON.parse((await getHello(bridge.port, ORIGIN)).body).session.lastAgentCallAt).toEqual(
      expect.any(String)
    );
  });

  it("keeps the tab's tools listed while the tab reloads and only announces real changes", async () => {
    const bridge = await bridgeOnFreePort();
    const client = await connectedAgent(bridge);
    let announcements = 0;
    client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
      announcements += 1;
    });
    const first = await connectTab(bridge.port);
    register(first);
    await first.next("session");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(announcements).toBe(1);

    first.socket.close();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await client.listTools()).tools.map((tool) => tool.name)).toContain("echo");

    const second = await connectTab(bridge.port);
    register(second);
    await second.next("session");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(announcements).toBe(1);

    register(second, [ECHO_TOOL, READ_TOOL]);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(announcements).toBe(2);
  });

  it("records which agent started the session", async () => {
    const bridge = await bridgeOnFreePort();
    await connectedAgent(bridge);
    expect(bridge.session().agent).toEqual({ name: "test-agent", version: "1.0.0" });
  });

  it("reaches tab tools through call_client_tool", async () => {
    const bridge = await bridgeOnFreePort();
    const client = await connectedAgent(bridge);
    const tab = await connectTab(bridge.port);
    answerCalls(tab);
    register(tab);
    await tab.next("session");
    const result = await client.callTool({
      name: "call_client_tool",
      arguments: { name: "echo", arguments: { text: "fallback" } },
    });
    expect(result.isError).toBe(false);
  });

  it("returns an error result with connection steps when no tab is connected", async () => {
    const bridge = await bridgeOnFreePort();
    const client = await connectedAgent(bridge);
    const result = await client.callTool({ name: "echo", arguments: {} });
    expect(result.isError).toBe(true);
  });
});
