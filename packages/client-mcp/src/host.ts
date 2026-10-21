import { execFileSync } from "node:child_process";

export type HostKind = "background" | "terminal" | "unknown";

export interface SessionHost {
  kind: HostKind;
  app: string | null;
}

const BACKGROUND_PATTERN = /\b(bg-spare|bg-pty-host|daemon run)\b/;
const APP_PATTERN = /\/([^/]+)\.app\//;
const MAX_ANCESTORS = 10;

export const UNKNOWN_HOST: SessionHost = { kind: "unknown", app: null };

export function hostFromAncestry(commands: readonly string[]): SessionHost {
  if (!commands.length) return UNKNOWN_HOST;
  if (commands.some((command) => BACKGROUND_PATTERN.test(command))) {
    return { kind: "background", app: null };
  }
  const appCommand = commands.find((command) => APP_PATTERN.test(command));
  const app = appCommand ? appCommand.match(APP_PATTERN)?.[1] ?? null : null;
  return { kind: "terminal", app };
}

function ancestorCommands(startPid: number) {
  const commands: string[] = [];
  let pid = startPid;
  for (let depth = 0; depth < MAX_ANCESTORS && pid > 1; depth++) {
    const line = execFileSync("ps", ["-o", "ppid=,command=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
    if (!line) break;
    const [, parent, command] = line.match(/^(\d+)\s+(.*)$/) ?? [];
    if (!parent) break;
    commands.push(command);
    pid = Number(parent);
  }
  return commands;
}

export function describeHost(startPid: number): SessionHost {
  if (process.platform === "win32") return UNKNOWN_HOST;
  try {
    return hostFromAncestry(ancestorCommands(startPid));
  } catch {
    return UNKNOWN_HOST;
  }
}
