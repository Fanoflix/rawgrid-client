import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";

interface GridSlotProps {
  slotIndex: number;
  isEditMode: boolean;
  canHide: boolean;
  onHide: () => void;
  children: ReactNode;
}

export function GridSlot({
  slotIndex,
  isEditMode,
  canHide,
  onHide,
  children,
}: GridSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { slotIndex },
  });

  return (
    <div ref={setNodeRef} className="relative h-full w-full">
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
