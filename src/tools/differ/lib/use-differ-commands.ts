import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { DIFFER_COMMANDS } from "@/tools/differ/lib/constants";
import { useDiffer } from "@/tools/differ/lib/use-differ";

export function useDifferWithCommands() {
  const differ = useDiffer();

  useEffect(() => {
    const unsubs = [
      subscribe(DIFFER_COMMANDS.swap, () => differ.swapSides()),
      subscribe(DIFFER_COMMANDS.clear, () => differ.clearBoth()),
      subscribe(DIFFER_COMMANDS.next, () => differ.goToChange(1)),
      subscribe(DIFFER_COMMANDS.previous, () => differ.goToChange(-1)),
      subscribe(DIFFER_COMMANDS.json, () => differ.toggleJsonMode()),
      subscribe(DIFFER_COMMANDS.whitespace, () =>
        differ.toggleIgnoreWhitespace()
      ),
      subscribe(DIFFER_COMMANDS.collapse, () =>
        differ.toggleCollapseUnchanged()
      ),
      subscribe(DIFFER_COMMANDS.setOriginal, (payload) => {
        if (payload) differ.setSide("original", payload);
      }),
      subscribe(DIFFER_COMMANDS.setChanged, (payload) => {
        if (payload) differ.setSide("changed", payload);
      }),
    ];
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  });

  return differ;
}
