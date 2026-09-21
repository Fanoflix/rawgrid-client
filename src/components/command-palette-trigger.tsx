import { Search } from "lucide-react";

import { OPEN_COMMAND_PALETTE } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { dispatch } from "@/lib/command-bus";

const isMac =
  typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.userAgent);

export function CommandPaletteTrigger() {
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      onClick={() => dispatch(OPEN_COMMAND_PALETTE)}
      aria-label="open command palette"
      aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
      className="w-72 shrink-0 justify-start gap-2.5 font-normal text-muted-foreground"
    >
      <Search />
      <span className="flex-1 truncate text-left">do everything via keyboard</span>
      <kbd className="px-1 font-mono text-[10px] leading-4">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </Button>
  );
}
