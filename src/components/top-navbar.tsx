import { Pencil, RotateCcw } from "lucide-react";

import { HiddenToolsMenu } from "@/components/hidden-tools-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "./ui/button";
import type { useLayout } from "@/lib/use-layout";

interface TopNavbarProps {
  layoutState: ReturnType<typeof useLayout>;
}

export function TopNavbar({ layoutState }: TopNavbarProps) {
  const { isEditMode, setEditMode, hiddenTools, showTool, resetLayout } =
    layoutState;

  return (
    <nav className="flex justify-between px-1.5">
      <p className="flex items-center flex-nowrap text-nowrap gap-0.75 text-xs">
        small toolbox —{" "}
        <a
          href="https://ammarnasir.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary tracking-[0.05rem]"
        >
          ammarnasir.com
        </a>
      </p>

      <div className="h-9 flex items-center justify-end w-screen bg-background gap-1">
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
