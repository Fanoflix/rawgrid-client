import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("keeps the scaled font size tokens next to a text color", () => {
    expect(cn("text-10 text-muted-foreground")).toBe("text-10 text-muted-foreground");
    expect(cn("text-11 text-primary")).toBe("text-11 text-primary");
    expect(cn("text-13 text-foreground")).toBe("text-13 text-foreground");
  });

  it("still lets a later font size override an earlier one", () => {
    expect(cn("text-11", "text-xs")).toBe("text-xs");
    expect(cn("text-xs", "text-10")).toBe("text-10");
  });
});
