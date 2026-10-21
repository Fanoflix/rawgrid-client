export const CLIENT_MCP = {
  protocol: "rawgrid-client-mcp",
  firstPort: 47821,
  lastPort: 47830,
  helloPath: "/hello",
  probeTimeoutMs: 1500,
  connectTimeoutMs: 6000,
} as const;

export interface ClientMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: { readOnlyHint?: boolean };
}

export type ClientMcpHostKind = "background" | "terminal" | "unknown";

export interface ClientMcpSession {
  port: number;
  id: string;
  cwd: string;
  startedAt: string;
  agentName: string | null;
  isAgentActive: boolean;
  hostKind: ClientMcpHostKind;
  hostApp: string | null;
  isOutdated: boolean;
  isTaken: boolean;
}

export type ClientMcpCallResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export interface ClientMcpConnectOptions {
  clientName: string;
  tools: ClientMcpTool[];
  onCall: (tool: string, args: Record<string, unknown>) => Promise<ClientMcpCallResult>;
  onSession: (session: ClientMcpSession) => void;
  onClose: (reason: "closed" | "replaced") => void;
}

export interface ClientMcpConnection {
  session: ClientMcpSession;
  close: () => void;
}

interface SessionPayload {
  id: string;
  cwd: string;
  startedAt: string;
  agent: { name: string } | null;
  lastAgentCallAt?: string | null;
  host?: { kind: ClientMcpHostKind; app: string | null };
}

type ServerMessage =
  | { type: "hello"; protocol: string; session: SessionPayload; isTaken: boolean }
  | { type: "session"; session: SessionPayload; isTaken: boolean }
  | { type: "call"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "replaced" };

function sessionFrom(port: number, session: SessionPayload, isTaken: boolean): ClientMcpSession {
  return {
    port,
    id: session.id,
    cwd: session.cwd,
    startedAt: session.startedAt,
    agentName: session.agent?.name ?? null,
    isAgentActive: Boolean(session.lastAgentCallAt),
    hostKind: session.host?.kind ?? "unknown",
    hostApp: session.host?.app ?? null,
    isOutdated: session.host === undefined,
    isTaken,
  };
}

function parseMessage(raw: unknown): ServerMessage | null {
  if (typeof raw !== "string") return null;
  try {
    const message = JSON.parse(raw) as ServerMessage;
    return message && typeof message.type === "string" ? message : null;
  } catch {
    return null;
  }
}

function urlFor(port: number) {
  return `ws://127.0.0.1:${port}`;
}

function openAndGreet(port: number) {
  return new Promise<{ socket: WebSocket; session: ClientMcpSession } | null>((resolve) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(urlFor(port));
    } catch {
      resolve(null);
      return;
    }
    const timer = window.setTimeout(() => {
      socket.close();
      resolve(null);
    }, CLIENT_MCP.connectTimeoutMs);
    socket.addEventListener("message", (event) => {
      const message = parseMessage(event.data);
      if (message?.type !== "hello" || message.protocol !== CLIENT_MCP.protocol) return;
      window.clearTimeout(timer);
      resolve({ socket, session: sessionFrom(port, message.session, message.isTaken) });
    });
    socket.addEventListener("error", () => {
      window.clearTimeout(timer);
      resolve(null);
    });
  });
}

async function greetOverSocket(port: number) {
  const greeted = await openAndGreet(port);
  greeted?.socket.close();
  return greeted?.session ?? null;
}

function helloUrl(port: number) {
  return `http://127.0.0.1:${port}${CLIENT_MCP.helloPath}`;
}

async function isListening(port: number) {
  try {
    await fetch(helloUrl(port), {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(CLIENT_MCP.probeTimeoutMs),
    });
    return true;
  } catch {
    return false;
  }
}

async function fetchHello(port: number) {
  const response = await fetch(helloUrl(port), {
    cache: "no-store",
    signal: AbortSignal.timeout(CLIENT_MCP.probeTimeoutMs),
  });
  const message = (await response.json()) as ServerMessage;
  if (message?.type !== "hello" || message.protocol !== CLIENT_MCP.protocol) return null;
  return sessionFrom(port, message.session, message.isTaken);
}

async function probeSession(port: number): Promise<ClientMcpSession | null> {
  if (!(await isListening(port))) return null;
  try {
    return await fetchHello(port);
  } catch {
    return greetOverSocket(port);
  }
}

export async function scanClientMcpSessions() {
  const ports: number[] = [];
  for (let port = CLIENT_MCP.firstPort; port <= CLIENT_MCP.lastPort; port++) ports.push(port);
  const found = await Promise.all(ports.map(probeSession));
  return found.filter((session): session is ClientMcpSession => session !== null);
}

export async function connectClientMcp(
  port: number,
  options: ClientMcpConnectOptions
): Promise<ClientMcpConnection | null> {
  const greeted = await openAndGreet(port);
  if (!greeted) return null;
  const { socket } = greeted;
  let closeReason: "closed" | "replaced" = "closed";

  function send(message: unknown) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  socket.addEventListener("message", (event) => {
    const message = parseMessage(event.data);
    if (!message) return;
    if (message.type === "session") {
      options.onSession(sessionFrom(port, message.session, message.isTaken));
      return;
    }
    if (message.type === "replaced") {
      closeReason = "replaced";
      socket.close();
      return;
    }
    if (message.type !== "call") return;
    options
      .onCall(message.tool, message.args ?? {})
      .catch((error: unknown) => ({
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      }))
      .then((result) => send({ type: "result", id: message.id, ...result }));
  });
  socket.addEventListener("close", () => options.onClose(closeReason));

  send({ type: "register", client: { name: options.clientName }, tools: options.tools });
  return {
    session: { ...greeted.session, isTaken: true },
    close: () => socket.close(),
  };
}
