import type { ReactElement, ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface HintProps {
  label: ReactNode;
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Hint({ label, children, side = "top", className }: HintProps) {
  return (
    <Tooltip disabled={!label}>
      <TooltipTrigger delay={0} closeDelay={0} render={children} data-hint="" />
      <TooltipContent
        side={side}
        sideOffset={4}
        className={cn(
          "max-w-72 px-1.5 py-0.5 font-mono text-10 leading-snug wrap-break-word",
          className
        )}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
