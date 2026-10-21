import { describe, expect, it } from "vitest";

import { describeHost, hostFromAncestry } from "./host.js";

describe("hostFromAncestry", () => {
  it("spots Claude Code's background spares by their daemon ancestors", () => {
    expect(
      hostFromAncestry([
        "npm exec @rawgrid/client-mcp",
        "claude bg-spare --bg-spare /tmp/cc-daemon-501/spare/7b790c2f.claim.sock",
        "claude bg-pty-host --bg-pty-host /tmp/cc-daemon-501/spare/7b790c2f.pty.sock 200 5",
        "/Users/apple/.local/bin/claude daemon run --json-path /Users/apple/.claude/daemon.json",
      ])
    ).toEqual({ kind: "background", app: null });
  });

  it("names the app whose terminal runs the agent", () => {
    expect(
      hostFromAncestry([
        "npm exec @rawgrid/client-mcp",
        "claude",
        "/bin/zsh -il",
        "/Applications/VSCodium.app/Contents/Frameworks/VSCodium Helper.app/Contents/MacOS/VSCodium Helper",
      ])
    ).toEqual({ kind: "terminal", app: "VSCodium" });
    expect(
      hostFromAncestry(["claude", "-zsh", "login -pf apple", "/System/Applications/Utilities/Terminal.app/Contents/MacOS/Terminal"])
    ).toEqual({ kind: "terminal", app: "Terminal" });
  });

  it("falls back to a plain terminal or unknown", () => {
    expect(hostFromAncestry(["claude", "-zsh", "sshd: apple@ttys001"])).toEqual({ kind: "terminal", app: null });
    expect(hostFromAncestry([])).toEqual({ kind: "unknown", app: null });
  });

  it("describes the real process tree without throwing", () => {
    expect(["background", "terminal", "unknown"]).toContain(describeHost(process.pid).kind);
  });
});
