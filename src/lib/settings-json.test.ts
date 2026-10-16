import { describe, expect, it } from "vitest";
import { parser } from "@lezer/json";

import {
  findSettingsFields,
  parseSettingsJson,
  settingsToJson,
} from "@/lib/settings-json";

const EMPTY_THEME = { fonts: {}, light: {}, dark: {} };

describe("settingsToJson", () => {
  it("lists every setting with its current or default value", () => {
    expect(
      JSON.parse(
        settingsToJson({
          fontScaleLevel: 2,
          theme: { fonts: { mono: "fira-code" }, light: {}, dark: { primary: "#123456" } },
        })
      )
    ).toEqual({
      fontSize: 120,
      fonts: { ui: "nunito-sans", mono: "fira-code" },
      light: { primary: "#e7000b", accent: "#1a83db" },
      dark: { primary: "#123456", accent: "#1a83db" },
    });
  });

  it("round-trips through the parser", () => {
    const settings = {
      fontScaleLevel: -1,
      theme: { fonts: { ui: "inter" }, light: { accent: "#00ff00" }, dark: {} },
    };
    expect(parseSettingsJson(settingsToJson(settings))).toEqual({ settings, errors: null });
  });
});

describe("parseSettingsJson", () => {
  it("treats missing keys as defaults", () => {
    expect(parseSettingsJson("{}")).toEqual({
      settings: { fontScaleLevel: 0, theme: EMPTY_THEME },
      errors: null,
    });
  });

  it("rejects unknown keys at every level and applies nothing", () => {
    const result = parseSettingsJson(
      JSON.stringify({
        theme: "dark",
        fonts: { heading: "inter" },
        light: { primry: "#ff0000", primary: "#00ff00" },
      })
    );
    expect(result.settings).toBeNull();
    expect(result.errors?.map((error) => error.path)).toEqual([
      "theme",
      "fonts.heading",
      "light.primry",
    ]);
  });

  it("reports bad values with their path", () => {
    const result = parseSettingsJson(
      JSON.stringify({
        fontSize: 115,
        fonts: { ui: "comic-sans", mono: 3 },
        dark: { primary: "red", accent: "#12" },
      })
    );
    expect(result.errors?.map((error) => error.path)).toEqual([
      "fontSize",
      "fonts.ui",
      "fonts.mono",
      "dark.primary",
      "dark.accent",
    ]);
  });

  it("reports broken json and non-object roots", () => {
    expect(parseSettingsJson("{").errors?.[0].path).toBe("json");
    expect(parseSettingsJson("[]").errors).toEqual([
      { path: "json", message: "expected an object" },
    ]);
  });
});

describe("findSettingsFields", () => {
  it("finds color and font values with their exact text range", () => {
    const text = settingsToJson({ fontScaleLevel: 0, theme: EMPTY_THEME });
    const fields = findSettingsFields(parser.parse(text), (from, to) =>
      text.slice(from, to)
    );
    expect(fields.map((field) => [field.path, field.value])).toEqual([
      ["fonts.ui", "nunito-sans"],
      ["fonts.mono", "system"],
      ["light.primary", "#e7000b"],
      ["light.accent", "#1a83db"],
      ["dark.primary", "#fb2c36"],
      ["dark.accent", "#1a83db"],
    ]);
    const lightPrimary = fields[2];
    expect(text.slice(lightPrimary.from, lightPrimary.to)).toBe('"#e7000b"');
  });

  it("ignores strings that are keys or sit at other paths", () => {
    const text = '{"light": {"note": "#ffffff"}, "primary": "#000000"}';
    expect(findSettingsFields(parser.parse(text), (from, to) => text.slice(from, to))).toEqual([]);
  });
});
