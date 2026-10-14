import type { CSSProperties, ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GridSlotProps {
  slotIndex: number;
  isEditMode: boolean;
  canHide: boolean;
  isFocused: boolean;
  focusTop: number;
  onHide: () => void;
  children: ReactNode;
}

export function GridSlot({
  slotIndex,
  isEditMode,
  canHide,
  isFocused,
  focusTop,
  onHide,
  children,
}: GridSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { slotIndex },
  });

  const focusStyle: CSSProperties | undefined = isFocused
    ? { position: "fixed", top: focusTop, left: 0, right: 0, bottom: 0 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={focusStyle}
      className={cn(
        "relative h-full w-full",
        isFocused && "visible z-30 h-auto w-auto bg-background"
      )}
    >
      {children}

      {isEditMode && isOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-md border-2 border-primary bg-primary/10">
          <span className="rounded-md bg-background px-2 py-1 text-foreground text-xs shadow-md select-none">
            Drop and switch spaces
          </span>
        </div>
      )}

      {isEditMode && canHide && (
        <div className="absolute top-1.5 right-1.5 z-30 flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="primary-outline"
            onClick={onHide}
            className="shadow-md"
          >
            <EyeOff />
            hide space
          </Button>
        </div>
      )}
    </div>
  );
}
