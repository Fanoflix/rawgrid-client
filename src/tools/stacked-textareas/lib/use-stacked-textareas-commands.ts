import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useStackedTextareas } from "@/tools/stacked-textareas/lib/use-stacked-textareas";

export function useStackedTextareasWithCommands() {
  const stackedTextareas = useStackedTextareas();

  useEffect(() => {
    return subscribe("notes:add", (payload) => {
      if (payload) stackedTextareas.addNote(payload);
    });
  });

  return stackedTextareas;
}
