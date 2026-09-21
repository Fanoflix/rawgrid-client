export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

function normalizeHex(hex: string) {
  return hex.replace("#", "").trim();
}

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = normalizeHex(hex);
  if (![3, 6].includes(normalized.length)) return null;
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  const numeric = Number.parseInt(expanded, 16);
  if (Number.isNaN(numeric)) return null;
  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case red:
        h = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        h = (blue - red) / delta + 2;
        break;
      default:
        h = (red - green) / delta + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function formatRgb(color: RgbColor) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function formatHsl(color: HslColor) {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const [red, green, blue] =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const match = lightness - chroma / 2;
  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

// Parsers for hand-typed values. Each returns a canonical #rrggbb, or null if
// the text isn't a complete, in-range color yet.

/** Splits "fn(a, b c / d)" or a bare "a b c" into its three arguments. */
function readParts(value: string, functionNamePattern: string) {
  const inner = value
    .trim()
    .toLowerCase()
    .replace(new RegExp(`^${functionNamePattern}\\((.*)\\)$`), "$1");
  const parts = inner.split(/[\s,/]+/).filter(Boolean);
  return parts.length === 3 ? parts : null;
}

function readNumbers(value: string, functionNamePattern: string) {
  const parts = readParts(value, functionNamePattern);
  if (!parts) return null;
  const numbers = parts.map((part) => Number(part.replace(/%$|deg$/, "")));
  return numbers.every(Number.isFinite) ? numbers : null;
}

/** A number, or a percentage of `percentOf` when it ends in "%". */
function readScaled(part: string, percentOf: number) {
  const isPercent = part.endsWith("%");
  const number = Number(part.replace(/%$/, ""));
  if (!Number.isFinite(number)) return null;
  return isPercent ? (number / 100) * percentOf : number;
}

export function parseHexInput(value: string) {
  const normalized = normalizeHex(value);
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(normalized)) return null;
  const rgb = hexToRgb(normalized);
  return rgb ? rgbToHex(rgb) : null;
}

function isRgbChannel(channel: number | null): channel is number {
  return channel !== null && channel >= 0 && channel <= 255;
}

export function parseRgbInput(value: string) {
  const parts = readParts(value, "rgba?");
  if (!parts) return null;
  const channels = parts.map((part) => readScaled(part, 255));
  if (!channels.every(isRgbChannel)) return null;
  const [r, g, b] = channels.map(Math.round);
  return rgbToHex({ r, g, b });
}

export function parseHslInput(value: string) {
  const numbers = readNumbers(value, "hsla?");
  if (!numbers) return null;
  const [h, s, l] = numbers;
  if (s < 0 || s > 100 || l < 0 || l > 100) return null;
  return rgbToHex(hslToRgb({ h, s, l }));
}

export function parseHwbInput(value: string) {
  const numbers = readNumbers(value, "hwb");
  if (!numbers) return null;
  const [h, w, b] = numbers;
  if (w < 0 || w > 100 || b < 0 || b > 100) return null;
  return rgbToHex(hwbToRgb({ h, w, b }));
}

export function parseOklabInput(value: string) {
  const parts = readParts(value, "oklab");
  if (!parts) return null;
  const [l, a, b] = [
    readScaled(parts[0], 1),
    readScaled(parts[1], 0.4),
    readScaled(parts[2], 0.4),
  ];
  if (l === null || a === null || b === null || l < 0 || l > 1) return null;
  return rgbToHex(oklabToRgb({ l, a, b }));
}

export function parseOklchInput(value: string) {
  const parts = readParts(value, "oklch");
  if (!parts) return null;
  const l = readScaled(parts[0], 1);
  const c = readScaled(parts[1], 0.4);
  const h = Number(parts[2].replace(/deg$/, ""));
  if (l === null || c === null || !Number.isFinite(h)) return null;
  if (l < 0 || l > 1 || c < 0) return null;
  return rgbToHex(oklchToRgb({ l, c, h }));
}

// HWB: hue plus how much white and black are mixed in.

interface HwbColor {
  h: number;
  w: number;
  b: number;
}

export function rgbToHwb(rgb: RgbColor): HwbColor {
  const { h } = rgbToHsl(rgb);
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  return { h, w: Math.round(min * 100), b: Math.round((1 - max) * 100) };
}

function hwbToRgb({ h, w, b }: HwbColor): RgbColor {
  let white = w / 100;
  let black = b / 100;
  // Past 100% combined, CSS scales them down to grey.
  if (white + black > 1) {
    const total = white + black;
    white /= total;
    black /= total;
  }
  const pureHue = hslToRgb({ h, s: 100, l: 50 });
  const mixInWhiteAndBlack = (channel: number) =>
    Math.round((channel / 255) * (1 - white - black) * 255 + white * 255);
  return {
    r: mixInWhiteAndBlack(pureHue.r),
    g: mixInWhiteAndBlack(pureHue.g),
    b: mixInWhiteAndBlack(pureHue.b),
  };
}

// OKLab / OKLCH (Björn Ottosson's perceptual space, what CSS oklab()/oklch()
// use). Colors outside sRGB are clamped when converted back.

interface OklabColor {
  l: number;
  a: number;
  b: number;
}

interface OklchColor {
  l: number;
  c: number;
  h: number;
}

function toLinear(channel: number) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number) {
  const encoded =
    value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, encoded)) * 255);
}

export function rgbToOklab({ r, g, b }: RgbColor): OklabColor {
  const red = toLinear(r);
  const green = toLinear(g);
  const blue = toLinear(b);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToRgb({ l, a, b }: OklabColor): RgbColor {
  const lCone = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mCone = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sCone = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: fromLinear(4.0767416621 * lCone - 3.3077115913 * mCone + 0.2309699292 * sCone),
    g: fromLinear(-1.2684380046 * lCone + 2.6097574011 * mCone - 0.3413193965 * sCone),
    b: fromLinear(-0.0041960863 * lCone - 0.7034186147 * mCone + 1.707614701 * sCone),
  };
}

export function oklabToOklch({ l, a, b }: OklabColor): OklchColor {
  const c = Math.hypot(a, b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l, c, h: (h + 360) % 360 };
}

function oklchToRgb({ l, c, h }: OklchColor): RgbColor {
  const radians = (h * Math.PI) / 180;
  return oklabToRgb({ l, a: c * Math.cos(radians), b: c * Math.sin(radians) });
}

function roundTo(value: number, digits: number) {
  // Avoids printing "-0" for tiny negative values.
  return Number(value.toFixed(digits)) + 0;
}

export function formatHwb({ h, w, b }: HwbColor) {
  return `hwb(${h} ${w}% ${b}%)`;
}

export function formatOklab({ l, a, b }: OklabColor) {
  return `oklab(${roundTo(l * 100, 2)}% ${roundTo(a, 4)} ${roundTo(b, 4)})`;
}

export function formatOklch({ l, c, h }: OklchColor) {
  // Hue is meaningless for greys; CSS writes it as 0.
  const hue = c < 0.00005 ? 0 : roundTo(h, 2);
  return `oklch(${roundTo(l * 100, 2)}% ${roundTo(c, 4)} ${hue})`;
}
