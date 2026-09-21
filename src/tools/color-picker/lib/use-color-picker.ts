import type { ChangeEvent } from "react";
import { useMemo } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { DEFAULT_COLOR } from "@/tools/color-picker/lib/constants";
import {
  formatHsl,
  formatHwb,
  formatOklab,
  formatOklch,
  formatRgb,
  hexToRgb,
  oklabToOklch,
  rgbToHsl,
  rgbToHwb,
  rgbToOklab,
} from "@/tools/color-picker/lib/utils";

export interface ColorPickerOutput {
  hex: string;
  rgb: string;
  hsl: string;
  hwb: string;
  oklab: string;
  oklch: string;
}

function serializeColor(value: string) {
  return value;
}

function deserializeColor(value: string) {
  return value || DEFAULT_COLOR;
}

function getColorOutput(color: string): ColorPickerOutput {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return { hex: color, rgb: "", hsl: "", hwb: "", oklab: "", oklch: "" };
  }
  const oklab = rgbToOklab(rgb);
  return {
    hex: color,
    rgb: formatRgb(rgb),
    hsl: formatHsl(rgbToHsl(rgb)),
    hwb: formatHwb(rgbToHwb(rgb)),
    oklab: formatOklab(oklab),
    oklch: formatOklch(oklabToOklch(oklab)),
  };
}

export function useColorPicker() {
  const { value: color, setValue: setColor } = useToolHistory<string>({
    tool: "color-picker",
    initialValue: DEFAULT_COLOR,
    serialize: serializeColor,
    deserialize: deserializeColor,
  });

  const output = useMemo(() => getColorOutput(color), [color]);

  function handleColorChange(event: ChangeEvent<HTMLInputElement>) {
    setColor(event.target.value);
  }

  return {
    color,
    output,
    setColor,
    handleColorChange,
  };
}
