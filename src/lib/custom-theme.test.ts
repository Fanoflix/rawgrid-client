import { describe, expect, it } from "vitest";

import {
  customThemeCss,
  parseStoredCustomTheme,
  readableForeground,
  withoutDefaults,
} from "@/lib/custom-theme";

describe("readableForeground", () => {
  it("puts light text on dark colors and dark text on light colors", () => {
    expect(readableForeground("#1e3a8a")).toBe("oklch(0.985 0 0)");
    expect(readableForeground("#facc15")).toBe("oklch(0.141 0.005 285.823)");
  });
});

describe("withoutDefaults", () => {
  it("drops values equal to the defaults and normalizes hex", () => {
    expect(
      withoutDefaults({
        fonts: { ui: "nunito-sans", mono: "fira-code" },
        light: { primary: "#E7000B" },
        dark: { primary: "#0F0" },
      })
    ).toEqual({
      fonts: { mono: "fira-code" },
      light: {},
      dark: { primary: "#00ff00" },
    });
  });

  it("drops unknown fonts and values that are not strings", () => {
    expect(
      withoutDefaults({
        fonts: { ui: "comic-sans" },
        light: { primary: 12 as unknown as string },
        dark: { primary: "blue" },
      })
    ).toEqual({ fonts: {}, light: {}, dark: {} });
  });
});

describe("customThemeCss", () => {
  it("is empty when nothing is customized", () => {
    expect(customThemeCss({ fonts: {}, light: {}, dark: {} })).toBe("");
  });

  it("scopes colors to their mode and adds a readable primary foreground", () => {
    const css = customThemeCss({
      fonts: { mono: "jetbrains-mono" },
      light: { primary: "#1e3a8a" },
      dark: { primary: "#facc15" },
    });
    expect(css).toBe(
      [
        ':root:root { --font-code: "JetBrains Mono Variable", monospace; }',
        "html:not(.dark) { --primary: #1e3a8a; --primary-foreground: oklch(0.985 0 0); }",
        "html.dark { --primary: #facc15; --primary-foreground: oklch(0.141 0.005 285.823); }",
      ].join("\n")
    );
  });
});

describe("parseStoredCustomTheme", () => {
  it("falls back to an empty theme for missing or broken values", () => {
    const empty = { fonts: {}, light: {}, dark: {} };
    expect(parseStoredCustomTheme(null)).toEqual(empty);
    expect(parseStoredCustomTheme("{oops")).toEqual(empty);
    expect(parseStoredCustomTheme("[]")).toEqual(empty);
  });

  it("keeps valid stored values", () => {
    expect(
      parseStoredCustomTheme('{"fonts":{"ui":"inter"},"light":{},"dark":{"primary":"#123456"}}')
    ).toEqual({ fonts: { ui: "inter" }, light: {}, dark: { primary: "#123456" } });
  });
});
