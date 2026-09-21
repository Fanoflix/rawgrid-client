import { useEffect, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";

import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { HiddenSpacesMenu } from "@/components/hidden-spaces-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import { subscribe } from "@/lib/command-bus";
import { HOVER_COMMAND } from "@/lib/tool-hover";
import { cn } from "@/lib/utils";
import { TOOL_REGISTRY, type ToolId } from "@/lib/tool-registry";
import type { useLayout } from "@/lib/use-layout";

interface TopNavbarProps {
  layoutState: ReturnType<typeof useLayout>;
}

export function TopNavbar({ layoutState }: TopNavbarProps) {
  const {
    isEditMode,
    setEditMode,
    toolsBySlot,
    hiddenSlots,
    showSlot,
    resetLayout,
  } = layoutState;

  const [hoveredToolId, setHoveredToolId] = useState<string | null>(null);

  useEffect(
    () => subscribe(HOVER_COMMAND, (toolId) => setHoveredToolId(toolId || null)),
    []
  );

  const hoveredTool = hoveredToolId
    ? TOOL_REGISTRY[hoveredToolId as ToolId]
    : null;

  return (
    <nav
      className={cn(
        "grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-1.5 transition-colors",
        isEditMode && "bg-primary/50"
      )}
    >
      <p className="flex min-w-0 items-center overflow-hidden flex-nowrap text-nowrap gap-0.75 text-xs">
        small toolbox —{" "}
        <a
          href="https://ammarnasir.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary tracking-[0.05rem]"
        >
          ammarnasir.com
        </a>
        <Button
          size="xs"
          variant="outline"
          nativeButton={false}
          className="ml-1.5"
          render={
            <a
              href="https://github.com/Fanoflix/rawgrid-client"
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          star // contribute
          <img
            src="github.svg"
            alt="GitHub"
            className="size-3 invert dark:invert-0"
          />
        </Button>
        {/* Keyed so each new hover replays the slide instead of swapping text in place. */}
        {hoveredTool && (
          <span
            key={hoveredToolId}
            aria-live="polite"
            className="animate-hint-in hint-flash flex min-w-0 items-center gap-1.5 pl-1 pr-2.5 rounded-[7px]"
          >
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate">{hoveredTool.name}</span>
            <span className="truncate text-muted-foreground">
              {hoveredTool.description}
            </span>
          </span>
        )}
      </p>

      <CommandPaletteTrigger />

      <div className="h-9 flex shrink-0 items-center justify-end gap-1">
        {isEditMode && (
          <>
            <HiddenSpacesMenu
              toolsBySlot={toolsBySlot}
              hiddenSlots={hiddenSlots}
              onShow={showSlot}
            />
            <Button size="xs" variant="outline" onClick={resetLayout}>
              <RotateCcw />
              Reset
            </Button>
          </>
        )}

        <Button
          size="xs"
          variant={isEditMode ? "default" : "outline"}
          onClick={() => setEditMode(!isEditMode)}
        >
          <Pencil />
          {isEditMode ? "done" : "edit spaces"}
        </Button>

        <ThemeToggle />
      </div>
    </nav>
  );
}
