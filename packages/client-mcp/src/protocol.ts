import { z } from "zod";

import type { ImageResult } from "./files.js";
import type { SessionHost } from "./host.js";

export const PROTOCOL = "rawgrid-client-mcp";
export const PROTOCOL_VERSION = 2;

export const PORT_RANGE = { first: 47821, last: 47830 } as const;
export const HELLO_PATH = "/hello";

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://fanoflix.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
] as const;

export const CALL_TIMEOUT_MS = 120_000;
export const RECONNECT_GRACE_MS = 30_000;
export const HEARTBEAT_MS = 15_000;

export interface ClientToolAnnotations {
  readOnlyHint?: boolean;
  [key: string]: unknown;
}

export interface ClientTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: ClientToolAnnotations;
}

export interface AgentInfo {
  name: string;
  version: string;
}

export interface SessionInfo {
  id: string;
  cwd: string;
  pid: number;
  startedAt: string;
  agent: AgentInfo | null;
  lastAgentCallAt: string | null;
  host: SessionHost;
}

export type CallOutcome =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type ServerMessage =
  | {
      type: "hello";
      protocol: typeof PROTOCOL;
      version: number;
      session: SessionInfo;
      isTaken: boolean;
    }
  | { type: "session"; session: SessionInfo; isTaken: boolean }
  | { type: "call"; id: string; tool: string; args: Record<string, unknown> }
  | { type: "located"; id: string; path: string | null; candidates: string[] }
  | ({ type: "image"; id: string } & ImageResult)
  | { type: "replaced" };

const clientToolSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  annotations: z.looseObject({ readOnlyHint: z.boolean().optional() }).optional(),
});

const tabMessageSchema = z.union([
  z.object({
    type: z.literal("register"),
    client: z.object({ name: z.string().min(1) }),
    tools: z.array(clientToolSchema),
  }),
  z.object({
    type: z.literal("result"),
    id: z.string(),
    ok: z.literal(true),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal("result"),
    id: z.string(),
    ok: z.literal(false),
    error: z.string(),
  }),
  z.object({
    type: z.literal("locate"),
    id: z.string(),
    name: z.string().min(1),
    firstLine: z.string(),
    hint: z.string().optional(),
  }),
  z.object({
    type: z.literal("read-image"),
    id: z.string(),
    path: z.string().min(1),
    includeData: z.boolean(),
  }),
]);

export type TabMessage = z.infer<typeof tabMessageSchema>;

export function parseTabMessage(raw: string): TabMessage | null {
  try {
    const parsed = tabMessageSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
