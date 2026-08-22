import { useEffect, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";

import { HiddenToolsMenu } from "@/components/hidden-tools-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import { subscribe } from "@/lib/command-bus";
import { EMPTY_SLOT, EMPTY_SLOT_HINT, HOVER_COMMAND } from "@/lib/tool-hover";
import { TOOL_REGISTRY, type ToolId } from "@/lib/tool-registry";
import type { useLayout } from "@/lib/use-layout";

interface TopNavbarProps {
  layoutState: ReturnType<typeof useLayout>;
}

export function TopNavbar({ layoutState }: TopNavbarProps) {
  const { isEditMode, setEditMode, hiddenTools, showTool, resetLayout } =
    layoutState;

  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(
    () => subscribe(HOVER_COMMAND, (toolId) => setHovered(toolId || null)),
    []
  );

  const isEmptySlot = hovered === EMPTY_SLOT;
  const hoveredTool =
    hovered && !isEmptySlot ? TOOL_REGISTRY[hovered as ToolId] : null;

  return (
    <nav className="flex justify-between px-1.5">
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
        {/* Keyed so each new hover replays the slide instead of swapping text in place. */}
        {(hoveredTool || isEmptySlot) && (
          <span
            key={hovered}
            aria-live="polite"
            className="animate-hint-in hint-flash flex min-w-0 items-center gap-1.5 pl-1 pr-2.5 rounded-[7px]"
          >
            <span className="text-muted-foreground/40">/</span>
            {isEmptySlot ? (
              <span className="truncate font-light text-muted-foreground">
                {EMPTY_SLOT_HINT}
              </span>
            ) : (
              <>
                <span className="truncate">{hoveredTool?.name}</span>
                <span className="truncate text-muted-foreground">
                  {hoveredTool?.description}
                </span>
              </>
            )}
          </span>
        )}
      </p>

      <div className="h-9 flex shrink-0 items-center justify-end bg-background gap-1">
        {isEditMode && (
          <>
            <HiddenToolsMenu hiddenTools={hiddenTools} onShow={showTool} />
            <Button
              size="xs"
              variant="outline"
              onClick={resetLayout}
              className="gap-1"
            >
              <RotateCcw className="size-3" />
              Reset
            </Button>
          </>
        )}

        <Button
          size="xs"
          variant={isEditMode ? "default" : "outline"}
          onClick={() => setEditMode(!isEditMode)}
          className="gap-1"
        >
          <Pencil className="size-3" />
          {isEditMode ? "done" : "edit spaces"}
        </Button>

        <Button size="xs" variant={"outline"}>
          <a
            href="https://github.com/Fanoflix/rawgrid-client"
            target="_blank"
            rel="noopener noreferrer"
            className="font-thin text-foreground flex items-center gap-1.75"
          >
            star // contribute
            <img
              src="github.svg"
              alt="GitHub"
              className="size-3 invert dark:invert-0"
            />
          </a>
        </Button>

        <ThemeToggle />
      </div>
    </nav>
  );
}
