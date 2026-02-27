import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useColorPicker } from "@/tools/color-picker/lib/use-color-picker";

export function useColorPickerWithCommands() {
  const colorPicker = useColorPicker();

  useEffect(() => {
    return subscribe("color:set", (payload) => {
      if (payload) colorPicker.setColor(payload);
    });
  });

  return colorPicker;
}
