import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { SAVE_COMMAND } from "@/lib/tool-hover";
import { MD_BUILDER_COMMANDS } from "@/tools/md-builder/lib/constants";
import { useMdBuilder } from "@/tools/md-builder/lib/use-md-builder";

export function useMdBuilderWithCommands() {
  const mdBuilder = useMdBuilder();

  useEffect(() => {
    const unsubs = [
      subscribe(MD_BUILDER_COMMANDS.open, () => mdBuilder.openFile()),
      subscribe(MD_BUILDER_COMMANDS.upload, () => mdBuilder.uploadFile()),
      subscribe(MD_BUILDER_COMMANDS.save, () => void mdBuilder.save()),
      subscribe(SAVE_COMMAND, (toolId) => {
        if (toolId === "md-builder") void mdBuilder.save();
      }),
      subscribe(MD_BUILDER_COMMANDS.refresh, () => mdBuilder.refresh()),
      subscribe(MD_BUILDER_COMMANDS.paste, () => mdBuilder.showPasteView()),
      subscribe(MD_BUILDER_COMMANDS.copy, () => void mdBuilder.copyMarkdown()),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  });

  return mdBuilder;
}
