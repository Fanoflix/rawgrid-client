import { describe, expect, it } from "vitest";

import {
  FONT_SCALE,
  FONT_SCALE_LEVELS,
  clampFontScaleLevel,
  fontScaleForLevel,
  fontScalePercentLabel,
  parseFontScaleLevel,
} from "@/lib/font-scale";

describe("font scale levels", () => {
  it("runs from -1 to 5 in whole steps", () => {
    expect(FONT_SCALE_LEVELS).toEqual([-1, 0, 1, 2, 3, 4, 5]);
  });

  it("maps each level to an even 10% step around 100%", () => {
    expect(FONT_SCALE_LEVELS.map(fontScaleForLevel)).toEqual([
      0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5,
    ]);
  });

  it("labels each level as a percentage", () => {
    expect(FONT_SCALE_LEVELS.map(fontScalePercentLabel)).toEqual([
      "90%",
      "100%",
      "110%",
      "120%",
      "130%",
      "140%",
      "150%",
    ]);
  });

  it("clamps levels to the range", () => {
    expect(clampFontScaleLevel(-4)).toBe(-1);
    expect(clampFontScaleLevel(9)).toBe(5);
    expect(clampFontScaleLevel(3)).toBe(3);
  });
});

describe("parseFontScaleLevel", () => {
  it("falls back to the default for missing or blank values", () => {
    expect(parseFontScaleLevel(null)).toBe(FONT_SCALE.defaultLevel);
    expect(parseFontScaleLevel("")).toBe(FONT_SCALE.defaultLevel);
    expect(parseFontScaleLevel("  ")).toBe(FONT_SCALE.defaultLevel);
  });

  it("falls back to the default for values that are not whole numbers", () => {
    expect(parseFontScaleLevel("large")).toBe(FONT_SCALE.defaultLevel);
    expect(parseFontScaleLevel("2.5")).toBe(FONT_SCALE.defaultLevel);
  });

  it("reads stored levels and clamps out-of-range ones", () => {
    expect(parseFontScaleLevel("3")).toBe(3);
    expect(parseFontScaleLevel("-1")).toBe(-1);
    expect(parseFontScaleLevel("12")).toBe(5);
    expect(parseFontScaleLevel("-7")).toBe(-1);
  });
});
