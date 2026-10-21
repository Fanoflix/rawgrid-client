import { describe, expect, it } from "vitest";

import {
  agentBriefFor,
  firstLineOf,
  orderSessions,
  sessionHostLabel,
  timeSince,
} from "@/tools/md-builder/lib/utils";

describe("agentBriefFor", () => {
  it("names the file and quotes its first line so the agent can tell same-named files apart", () => {
    const brief = agentBriefFor("plan.md", "\n\n# Data Room `v2` plan\n\nbody");
    expect(brief.split("\n")[0]).toBe(
      "Review the comments in `plan.md`. Its first line is `# Data Room 'v2' plan`. Find it in this project. If you can't, or several files match, ask me which one."
    );
  });

  it("leaves the first-line hint out when the document is empty", () => {
    expect(agentBriefFor("plan.md", "").split("\n")[0]).toBe(
      "Review the comments in `plan.md`. Find it in this project. If you can't, or several files match, ask me which one."
    );
  });

  it("cuts very long first lines", () => {
    expect(firstLineOf("x".repeat(200))).toHaveLength(80);
  });
});

describe("agent sessions in the live panel", () => {
  const session = (id: string, isAgentActive: boolean, hostKind: "terminal" | "background" | "unknown", startedAt: string) => ({
    id,
    isAgentActive,
    hostKind,
    startedAt,
  });

  it("lists active sessions first, then terminals, then background ones, newest first", () => {
    const ordered = orderSessions([
      session("spare", false, "background", "2026-10-22T09:00:00Z"),
      session("old-terminal", false, "terminal", "2026-10-22T08:00:00Z"),
      session("new-terminal", false, "terminal", "2026-10-22T10:00:00Z"),
      session("reviewing", true, "terminal", "2026-10-22T07:00:00Z"),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(["reviewing", "new-terminal", "old-terminal", "spare"]);
  });

  it("describes where the agent runs", () => {
    expect(sessionHostLabel("terminal", "VSCodium")).toBe("vscodium terminal");
    expect(sessionHostLabel("terminal", null)).toBe("terminal");
    expect(sessionHostLabel("background", null)).toBe("background, no terminal");
    expect(sessionHostLabel("unknown", null)).toBeNull();
  });

  it("says how long ago a session started", () => {
    const now = Date.parse("2026-10-22T10:00:00Z");
    expect(timeSince("2026-10-22T09:59:30Z", now)).toBe("just now");
    expect(timeSince("2026-10-22T09:57:00Z", now)).toBe("3m ago");
    expect(timeSince("2026-10-22T07:30:00Z", now)).toBe("2h ago");
    expect(timeSince("2026-10-20T10:00:00Z", now)).toBe("2d ago");
  });
});
