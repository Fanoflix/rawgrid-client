import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, RotateCcw } from "lucide-react";

import { CommandPaletteTrigger } from "@/components/command-palette-trigger";
import { FocusIcon } from "@/components/focus-icon";
import { HiddenSpacesMenu } from "@/components/hidden-spaces-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button, buttonVariants } from "./ui/button";
import { subscribe } from "@/lib/command-bus";
import { HOVER_COMMAND } from "@/lib/tool-hover";
import { cn } from "@/lib/utils";
import { TOOL_REGISTRY, type ToolId } from "@/lib/tool-registry";
import type { useLayout } from "@/lib/use-layout";

interface TopNavbarProps {
  layoutState: ReturnType<typeof useLayout>;
}

interface ToolHint {
  toolId: ToolId;
  isLeaving: boolean;
}

const HINT_EXIT_MS = 200;
const HINT_LINGER_MS = 700;

export function TopNavbar({ layoutState }: TopNavbarProps) {
  const {
    isEditMode,
    setEditMode,
    toolsBySlot,
    hiddenSlots,
    showSlot,
    resetLayout,
    focusedToolId,
    focusTool,
    exitFocus,
  } = layoutState;

  const [hint, setHint] = useState<ToolHint | null>(null);
  const hintTimerRef = useRef<number | null>(null);

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current) {
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  const beginHintExit = useCallback(() => {
    clearHintTimer();
    hintTimerRef.current = window.setTimeout(() => {
      setHint((current) => (current ? { ...current, isLeaving: true } : null));
      hintTimerRef.current = window.setTimeout(() => {
        hintTimerRef.current = null;
        setHint((current) => (current?.isLeaving ? null : current));
      }, HINT_EXIT_MS);
    }, HINT_LINGER_MS);
  }, [clearHintTimer]);

  useEffect(() => {
    const unsubscribe = subscribe(HOVER_COMMAND, (toolId) => {
      if (toolId) {
        clearHintTimer();
        setHint({ toolId: toolId as ToolId, isLeaving: false });
        return;
      }
      beginHintExit();
    });
    return () => {
      unsubscribe();
      clearHintTimer();
    };
  }, [beginHintExit, clearHintTimer]);

  const shownHint: ToolHint | null = focusedToolId
    ? { toolId: focusedToolId, isLeaving: false }
    : hint;
  const hoveredTool = shownHint ? TOOL_REGISTRY[shownHint.toolId] : null;
  const isHintFocused = focusedToolId !== null;

  function handleHintMouseEnter() {
    if (isHintFocused) return;
    clearHintTimer();
    setHint((current) =>
      current?.isLeaving ? { ...current, isLeaving: false } : current
    );
  }

  function handleHintMouseLeave() {
    if (!isHintFocused) beginHintExit();
  }

  function handleFocusToggle() {
    if (!shownHint) return;
    if (isHintFocused) exitFocus();
    else focusTool(shownHint.toolId);
  }

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
        {shownHint && hoveredTool && (
          <span
            key={shownHint.toolId}
            aria-live="polite"
            onMouseEnter={handleHintMouseEnter}
            onMouseLeave={handleHintMouseLeave}
            className={cn(
              "flex min-w-0 items-center gap-1.5 pl-1 pr-1 rounded-[7px]",
              shownHint.isLeaving
                ? "animate-hint-out"
                : "animate-hint-in hint-flash",
              isHintFocused && "bg-primary/15"
            )}
          >
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate">{hoveredTool.name}</span>
            <span className="truncate text-muted-foreground">
              {hoveredTool.description}
            </span>
            <Tooltip>
              <TooltipTrigger
                type="button"
                delay={300}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-xs" }),
                  "shrink-0"
                )}
                onClick={handleFocusToggle}
                aria-label={isHintFocused ? "exit focus mode" : "focus this tool"}
                aria-pressed={isHintFocused}
              >
                <FocusIcon isOff={isHintFocused} className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isHintFocused ? "exit focus mode (esc)" : "focus mode"}
              </TooltipContent>
            </Tooltip>
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
