import type { ReactNode } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./ui/button";

export interface ToolInfoProps {
  name: string;
  description: string;
  detailed: ReactNode;
  triggerText: string;
}

export function ToolInfo({
  name,
  description,
  detailed,
  triggerText,
}: ToolInfoProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
        aria-label={`${name} help`}
        delay={0}
      >
        <div className="flex items-center gap-1">
          {triggerText} <InfoIcon />
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs border border-border p-4 text-xs">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex flex-col gap-0">
            <h3 className="text-sm font-medium">{name}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>

          {Boolean(detailed) && (
            <div className="h-px w-full bg-muted-foreground/50" />
          )}
          <div className="text-muted-foreground text-xs">{detailed}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
