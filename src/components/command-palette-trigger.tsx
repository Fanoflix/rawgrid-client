import { Search } from "lucide-react";

import { OPEN_COMMAND_PALETTE } from "@/components/command-palette";
import { Kbd } from "@/components/kbd";
import { Button } from "@/components/ui/button";
import { dispatch } from "@/lib/command-bus";
import { IS_MAC, MOD_KEY_LABEL } from "@/lib/utils";

export function CommandPaletteTrigger() {
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      onClick={() => dispatch(OPEN_COMMAND_PALETTE)}
      aria-label="open command palette"
      aria-keyshortcuts={IS_MAC ? "Meta+K" : "Control+K"}
      className="w-72 shrink-0 justify-start gap-2.5 font-normal text-muted-foreground"
    >
      <Search />
      <span className="flex-1 truncate text-left">do everything via keyboard</span>
      <Kbd keys={[MOD_KEY_LABEL, "K"]} />
    </Button>
  );
}
