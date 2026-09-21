import { EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ToolsBySlot } from "@/lib/layout-config";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

interface HiddenSpacesMenuProps {
  toolsBySlot: ToolsBySlot;
  hiddenSlots: number[];
  onShow: (slotIndex: number) => void;
}

// A hidden space keeps its tool, so each one is listed by that tool's name.
export function HiddenSpacesMenu({
  toolsBySlot,
  hiddenSlots,
  onShow,
}: HiddenSpacesMenuProps) {
  if (hiddenSlots.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="xs" variant="outline">
            <EyeOff />
            <span>
              {hiddenSlots.length} hidden{" "}
              {hiddenSlots.length === 1 ? "space" : "spaces"}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {hiddenSlots.map((slot) => (
          <DropdownMenuItem key={slot} onClick={() => onShow(slot)}>
            {TOOL_REGISTRY[toolsBySlot[slot]].name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
