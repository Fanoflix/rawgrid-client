import type { ChangeEvent } from "react";
import { useMemo } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { DEFAULT_COLOR } from "@/tools/color-picker/lib/constants";
import {
  formatHsl,
  formatRgb,
  hexToRgb,
  rgbToHsl,
} from "@/tools/color-picker/lib/utils";

export interface ColorPickerOutput {
  hex: string;
  rgb: string;
  hsl: string;
}

function serializeColor(value: string) {
  return value;
}

function deserializeColor(value: string) {
  return value || DEFAULT_COLOR;
}

export function useColorPicker() {
  const { value: color, setValue: setColor } = useToolHistory<string>({
    tool: "color-picker",
    initialValue: DEFAULT_COLOR,
    serialize: serializeColor,
    deserialize: deserializeColor,
  });

  const output = useMemo<ColorPickerOutput>(() => {
    const rgb = hexToRgb(color);
    const hsl = rgb ? rgbToHsl(rgb) : null;
    return {
      hex: color,
      rgb: rgb ? formatRgb(rgb) : "",
      hsl: hsl ? formatHsl(hsl) : "",
    };
  }, [color]);

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
