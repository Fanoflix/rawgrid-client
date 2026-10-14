import { useEffect, useRef, useState } from "react";
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
const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const FOCUS_HOTKEY_KEYS = IS_MAC ? ["⌘", "⇧", "F"] : ["ctrl", "⇧", "F"];

function isFocusHotkey(event: KeyboardEvent) {
  const hasModifier = IS_MAC ? event.metaKey : event.ctrlKey;
  return hasModifier && event.shiftKey && event.key.toLowerCase() === "f";
}

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
  const hintExitTimerRef = useRef<number | null>(null);
  const lastHoveredRef = useRef<ToolId | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(HOVER_COMMAND, (toolId) => {
      if (hintExitTimerRef.current) {
        window.clearTimeout(hintExitTimerRef.current);
        hintExitTimerRef.current = null;
      }
      if (toolId) {
        lastHoveredRef.current = toolId as ToolId;
        setHint({ toolId: toolId as ToolId, isLeaving: false });
        return;
      }
      setHint((current) => (current ? { ...current, isLeaving: true } : null));
      hintExitTimerRef.current = window.setTimeout(() => {
        hintExitTimerRef.current = null;
        setHint((current) => (current?.isLeaving ? null : current));
      }, HINT_EXIT_MS);
    });
    return () => {
      unsubscribe();
      if (hintExitTimerRef.current) {
        window.clearTimeout(hintExitTimerRef.current);
      }
    };
  }, []);

  const isFocused = focusedToolId !== null;

  function toggleFocusMode() {
    if (isFocused) {
      exitFocus();
      return;
    }
    const firstVisible = toolsBySlot.find(
      (_, slot) => !hiddenSlots.includes(slot)
    );
    const target = lastHoveredRef.current ?? firstVisible;
    if (target) focusTool(target);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isFocusHotkey(event)) return;
      event.preventDefault();
      toggleFocusMode();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const hoveredTool = hint ? TOOL_REGISTRY[hint.toolId] : null;

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
        {hint && hoveredTool && (
          <span
            key={hint.toolId}
            aria-live="polite"
            className={cn(
              "flex min-w-0 items-center gap-1.5 pl-1 pr-2.5 rounded-[7px]",
              hint.isLeaving ? "animate-hint-out" : "animate-hint-in hint-flash"
            )}
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

        <Tooltip>
          <TooltipTrigger
            type="button"
            delay={300}
            className={cn(
              buttonVariants({
                variant: isFocused ? "default" : "outline",
                size: "xs",
              })
            )}
            onClick={toggleFocusMode}
            aria-pressed={isFocused}
          >
            <FocusIcon isOff={isFocused} className="size-3" />
            focus mode
            <kbd className="inline-flex h-4 items-center gap-0.5 rounded border border-current/20 px-1 font-sans text-[10px] leading-none tracking-wide opacity-70">
              {FOCUS_HOTKEY_KEYS.map((key) => (
                <span key={key}>{key}</span>
              ))}
            </kbd>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isFocused
              ? "back to your layout (esc)"
              : "give the hovered tool the whole grid"}
          </TooltipContent>
        </Tooltip>

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
