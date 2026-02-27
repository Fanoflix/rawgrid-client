import { EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ToolId } from "@/lib/tool-registry";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

interface HiddenToolsMenuProps {
  hiddenTools: ToolId[];
  onShow: (toolId: ToolId) => void;
}

export function HiddenToolsMenu({
  hiddenTools,
  onShow,
}: HiddenToolsMenuProps) {
  if (hiddenTools.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="xs" variant="outline" className="gap-1">
            <EyeOff className="size-3" />
            <span>{hiddenTools.length} hidden</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {hiddenTools.map((toolId) => (
          <DropdownMenuItem key={toolId} onClick={() => onShow(toolId)}>
            {TOOL_REGISTRY[toolId].name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
