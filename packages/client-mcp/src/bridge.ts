import { randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server as HttpServer,
} from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import {
  CALL_TIMEOUT_MS,
  HELLO_PATH,
  HEARTBEAT_MS,
  RECONNECT_GRACE_MS,
  PROTOCOL,
  PROTOCOL_VERSION,
  parseTabMessage,
  type AgentInfo,
  type CallOutcome,
  type ClientTool,
  type ServerMessage,
  type SessionInfo,
} from "./protocol.js";
import { locateDocument, readImage } from "./files.js";
import { describeHost } from "./host.js";
import { isAllowedHost, isAllowedOrigin } from "./security.js";

export interface BridgeOptions {
  ports: { first: number; last: number };
  allowedOrigins: readonly string[];
  cwd: string;
  callTimeoutMs?: number;
  heartbeatMs?: number;
  reconnectGraceMs?: number;
}

export interface Bridge {
  port: number;
  session: () => SessionInfo;
  isConnected: () => boolean;
  clientName: () => string | null;
  tools: () => ClientTool[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<CallOutcome>;
  setAgent: (agent: AgentInfo) => void;
  markAgentCall: () => void;
  onToolsChanged: (listener: () => void) => () => void;
  close: () => Promise<void>;
}

interface RegisteredTab {
  socket: WebSocket;
  clientName: string;
  tools: ClientTool[];
}

type SendOutcome = CallOutcome | { disconnected: true };

interface PendingCall {
  resolve: (outcome: SendOutcome) => void;
  timer: NodeJS.Timeout;
}

const DISCONNECTED: SendOutcome = { disconnected: true };

const BRIDGE_TEXT = {
  notConnected:
    "no rawgrid tab connected within 30 seconds. ask the user to open md builder in rawgrid, click live, and connect to this session.",
  interrupted:
    "the rawgrid tab disconnected before answering, so this change may or may not have been applied. call get_document to check before trying again.",
  timedOut: "the rawgrid tab did not answer in time.",
  unknownTool: "the connected rawgrid tab does not offer that tool.",
  closing: "the rawgrid server is shutting down.",
} as const;

function listen(httpServer: HttpServer, port: number) {
  return new Promise<boolean>((resolve, reject) => {
    function handleError(error: NodeJS.ErrnoException) {
      httpServer.off("listening", handleListening);
      if (error.code === "EADDRINUSE") resolve(false);
      else reject(error);
    }
    function handleListening() {
      httpServer.off("error", handleError);
      resolve(true);
    }
    httpServer.once("error", handleError);
    httpServer.once("listening", handleListening);
    httpServer.listen(port, "127.0.0.1");
  });
}

async function listenOnFirstFreePort(
  httpServer: HttpServer,
  ports: BridgeOptions["ports"]
) {
  for (let port = ports.first; port <= ports.last; port += 1) {
    if (await listen(httpServer, port)) return port;
  }
  throw new Error(
    `every port from ${ports.first} to ${ports.last} is in use. close another agent session and try again.`
  );
}

function send(socket: WebSocket, message: ServerMessage) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

export async function startBridge(options: BridgeOptions): Promise<Bridge> {
  const callTimeoutMs = options.callTimeoutMs ?? CALL_TIMEOUT_MS;
  const reconnectGraceMs = options.reconnectGraceMs ?? RECONNECT_GRACE_MS;
  const heartbeatMs = options.heartbeatMs ?? HEARTBEAT_MS;
  const session: SessionInfo = {
    id: randomBytes(4).toString("hex"),
    cwd: options.cwd,
    pid: process.pid,
    startedAt: new Date().toISOString(),
    agent: null,
    lastAgentCallAt: null,
    host: describeHost(process.pid),
  };

  const httpServer = createServer((request, response) => {
    const origin = request.headers.origin;
    const isTrusted =
      isAllowedOrigin(origin, options.allowedOrigins) &&
      isAllowedHost(request.headers.host, port);
    if (isTrusted && origin && request.url === HELLO_PATH) {
      const corsHeaders = {
        "access-control-allow-origin": origin,
        "access-control-allow-private-network": "true",
        "access-control-allow-methods": "GET",
        vary: "Origin",
      };
      if (request.method === "OPTIONS") {
        response.writeHead(204, corsHeaders);
        response.end();
        return;
      }
      if (request.method === "GET") {
        response.writeHead(200, {
          ...corsHeaders,
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        response.end(JSON.stringify(helloMessage()));
        return;
      }
    }
    response.writeHead(origin ? 403 : 426, { "content-type": "text/plain" });
    response.end("rawgrid client-mcp only answers rawgrid.\n");
  });
  const port = await listenOnFirstFreePort(httpServer, options.ports);

  const sockets = new Set<WebSocket>();
  const aliveSockets = new WeakSet<WebSocket>();
  const pendingCalls = new Map<string, PendingCall>();
  const toolListeners = new Set<() => void>();
  const tabWaiters = new Set<() => void>();
  let registered: RegisteredTab | null = null;
  let advertisedTools: ClientTool[] = [];
  let advertisedSignature = "";
  let isClosed = false;
  let nextCallId = 1;

  const webSocketServer = new WebSocketServer({
    server: httpServer,
    verifyClient: (info: { origin: string; req: IncomingMessage }) =>
      isAllowedOrigin(info.origin, options.allowedOrigins) &&
      isAllowedHost(info.req.headers.host, port),
  });

  function helloMessage(): ServerMessage {
    return {
      type: "hello",
      protocol: PROTOCOL,
      version: PROTOCOL_VERSION,
      session,
      isTaken: registered !== null,
    };
  }

  function advertise(tools: ClientTool[]) {
    const signature = JSON.stringify(tools);
    if (signature === advertisedSignature) return;
    advertisedTools = tools;
    advertisedSignature = signature;
    toolListeners.forEach((listener) => listener());
  }

  function broadcastSession() {
    sockets.forEach((socket) =>
      send(socket, { type: "session", session, isTaken: registered !== null })
    );
  }

  function dropPendingCalls() {
    pendingCalls.forEach((pending) => {
      clearTimeout(pending.timer);
      pending.resolve(DISCONNECTED);
    });
    pendingCalls.clear();
  }

  function waitForTab(timeoutMs: number) {
    if (registered) return Promise.resolve(registered);
    if (isClosed) return Promise.resolve(null);
    return new Promise<RegisteredTab | null>((resolve) => {
      const timer = setTimeout(() => {
        tabWaiters.delete(wake);
        resolve(null);
      }, timeoutMs);
      function wake() {
        clearTimeout(timer);
        tabWaiters.delete(wake);
        resolve(registered);
      }
      tabWaiters.add(wake);
    });
  }

  function releaseTab(socket: WebSocket) {
    if (registered?.socket !== socket) return;
    registered = null;
    dropPendingCalls();
    broadcastSession();
  }

  function handleMessage(socket: WebSocket, raw: string) {
    const message = parseTabMessage(raw);
    if (!message) return;
    if (message.type === "register") {
      const previous = registered;
      if (previous && previous.socket !== socket) {
        send(previous.socket, { type: "replaced" });
        dropPendingCalls();
      }
      registered = {
        socket,
        clientName: message.client.name,
        tools: message.tools,
      };
      advertise(message.tools);
      broadcastSession();
      [...tabWaiters].forEach((wake) => wake());
      return;
    }
    if (registered?.socket !== socket) return;
    if (message.type === "locate") {
      void locateDocument(options.cwd, message).then((located) =>
        send(socket, { type: "located", id: message.id, ...located })
      );
      return;
    }
    if (message.type === "read-image") {
      void readImage(options.cwd, message.path, message.includeData).then((image) =>
        send(socket, { type: "image", id: message.id, ...image })
      );
      return;
    }
    const pending = pendingCalls.get(message.id);
    if (!pending) return;
    pendingCalls.delete(message.id);
    clearTimeout(pending.timer);
    pending.resolve(
      message.ok
        ? { ok: true, value: message.value }
        : { ok: false, error: message.error }
    );
  }

  webSocketServer.on("connection", (socket) => {
    sockets.add(socket);
    aliveSockets.add(socket);
    send(socket, helloMessage());
    socket.on("pong", () => aliveSockets.add(socket));
    socket.on("message", (data) => handleMessage(socket, data.toString()));
    socket.on("close", () => {
      sockets.delete(socket);
      releaseTab(socket);
    });
  });

  const heartbeat = setInterval(() => {
    sockets.forEach((socket) => {
      if (!aliveSockets.has(socket)) {
        socket.terminate();
        return;
      }
      aliveSockets.delete(socket);
      socket.ping();
    });
  }, heartbeatMs);

  function sendCall(tab: RegisteredTab, name: string, args: Record<string, unknown>) {
    const id = String(nextCallId++);
    return new Promise<SendOutcome>((resolve) => {
      const timer = setTimeout(() => {
        pendingCalls.delete(id);
        resolve({ ok: false, error: BRIDGE_TEXT.timedOut });
      }, callTimeoutMs);
      pendingCalls.set(id, { resolve, timer });
      send(tab.socket, { type: "call", id, tool: name, args });
    });
  }

  async function callTool(name: string, args: Record<string, unknown>): Promise<CallOutcome> {
    for (;;) {
      const tab = await waitForTab(reconnectGraceMs);
      if (isClosed) return { ok: false, error: BRIDGE_TEXT.closing };
      if (!tab) return { ok: false, error: BRIDGE_TEXT.notConnected };
      const tool = tab.tools.find((candidate) => candidate.name === name);
      if (!tool) return { ok: false, error: BRIDGE_TEXT.unknownTool };
      const outcome = await sendCall(tab, name, args);
      if (!("disconnected" in outcome)) return outcome;
      if (isClosed) return { ok: false, error: BRIDGE_TEXT.closing };
      if (tool.annotations?.readOnlyHint !== true) {
        return { ok: false, error: BRIDGE_TEXT.interrupted };
      }
    }
  }

  return {
    port,
    session: () => session,
    isConnected: () => registered !== null,
    clientName: () => registered?.clientName ?? null,
    tools: () => advertisedTools,
    callTool,
    setAgent(agent) {
      session.agent = agent;
      broadcastSession();
    },
    markAgentCall() {
      const isFirstCall = session.lastAgentCallAt === null;
      session.lastAgentCallAt = new Date().toISOString();
      if (isFirstCall) broadcastSession();
    },
    onToolsChanged(listener) {
      toolListeners.add(listener);
      return () => toolListeners.delete(listener);
    },
    close() {
      isClosed = true;
      clearInterval(heartbeat);
      [...tabWaiters].forEach((wake) => wake());
      dropPendingCalls();
      sockets.forEach((socket) => socket.terminate());
      return new Promise<void>((resolve) => {
        webSocketServer.close(() => httpServer.close(() => resolve()));
      });
    },
  };
}
