export const CLIENT_MCP = {
  protocol: "rawgrid-client-mcp",
  firstPort: 47821,
  lastPort: 47830,
  helloPath: "/hello",
  probeTimeoutMs: 1500,
  connectTimeoutMs: 6000,
  requestTimeoutMs: 15000,
  filesVersion: 2,
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
  canReadFiles: boolean;
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

export type ClientMcpImageFailure =
  | "image_not_found"
  | "not_an_image"
  | "outside_project"
  | "image_too_large"
  | "bridge_outdated"
  | "not_connected";

export type ClientMcpImage =
  | { ok: true; path: string; mime: string; size: number; data?: string }
  | { ok: false; reason: ClientMcpImageFailure };

export interface ClientMcpLocateRequest {
  name: string;
  firstLine: string;
  hint?: string;
}

export interface ClientMcpLocated {
  path: string | null;
  candidates: string[];
}

export interface ClientMcpConnection {
  session: ClientMcpSession;
  locateDocument: (request: ClientMcpLocateRequest) => Promise<ClientMcpLocated>;
  readImage: (path: string, includeData: boolean) => Promise<ClientMcpImage>;
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
  | { type: "hello"; protocol: string; version?: number; session: SessionPayload; isTaken: boolean }
  | { type: "session"; session: SessionPayload; isTaken: boolean }
  | { type: "call"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "located"; id: string; path: string | null; candidates?: string[] }
  | ({ type: "image"; id: string } & ClientMcpImage)
  | { type: "replaced" };

const BRIDGE_OUTDATED: ClientMcpImage = { ok: false, reason: "bridge_outdated" };
const NOT_LOCATED: ClientMcpLocated = { path: null, candidates: [] };

function sessionFrom(
  port: number,
  session: SessionPayload,
  isTaken: boolean,
  protocolVersion: number
): ClientMcpSession {
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
    canReadFiles: protocolVersion >= CLIENT_MCP.filesVersion,
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
      resolve({
        socket,
        session: sessionFrom(port, message.session, message.isTaken, message.version ?? 1),
      });
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
  return sessionFrom(port, message.session, message.isTaken, message.version ?? 1);
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
  const { canReadFiles } = greeted.session;
  const protocolVersion = canReadFiles ? CLIENT_MCP.filesVersion : 1;
  const answers = new Map<string, (message: ServerMessage | null) => void>();
  let closeReason: "closed" | "replaced" = "closed";
  let nextRequestId = 1;

  function send(message: unknown) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function request(message: Record<string, unknown>) {
    const id = `r${nextRequestId++}`;
    return new Promise<ServerMessage | null>((resolve) => {
      const timer = window.setTimeout(() => {
        answers.delete(id);
        resolve(null);
      }, CLIENT_MCP.requestTimeoutMs);
      answers.set(id, (answer) => {
        window.clearTimeout(timer);
        answers.delete(id);
        resolve(answer);
      });
      send({ ...message, id });
    });
  }

  async function locateDocument(locate: ClientMcpLocateRequest): Promise<ClientMcpLocated> {
    if (!canReadFiles) return NOT_LOCATED;
    const answer = await request({ type: "locate", ...locate });
    if (answer?.type !== "located") return NOT_LOCATED;
    return {
      path: answer.path,
      candidates: answer.candidates ?? (answer.path ? [answer.path] : []),
    };
  }

  async function readImage(path: string, includeData: boolean): Promise<ClientMcpImage> {
    if (!canReadFiles) return BRIDGE_OUTDATED;
    const answer = await request({ type: "read-image", path, includeData });
    if (answer?.type !== "image") return { ok: false, reason: "image_not_found" };
    return answer.ok
      ? { ok: true, path: answer.path, mime: answer.mime, size: answer.size, data: answer.data }
      : { ok: false, reason: answer.reason };
  }

  socket.addEventListener("message", (event) => {
    const message = parseMessage(event.data);
    if (!message) return;
    if (message.type === "session") {
      options.onSession(sessionFrom(port, message.session, message.isTaken, protocolVersion));
      return;
    }
    if (message.type === "located" || message.type === "image") {
      answers.get(message.id)?.(message);
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
  socket.addEventListener("close", () => {
    answers.forEach((answer) => answer(null));
    options.onClose(closeReason);
  });

  send({ type: "register", client: { name: options.clientName }, tools: options.tools });
  return {
    session: { ...greeted.session, isTaken: true },
    locateDocument,
    readImage,
    close: () => socket.close(),
  };
}
