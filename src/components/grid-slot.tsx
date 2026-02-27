import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";

interface GridSlotProps {
  slotIndex: number;
  isEditMode: boolean;
  isEmpty: boolean;
  children?: ReactNode;
}

export function GridSlot({
  slotIndex,
  isEditMode,
  isEmpty,
  children,
}: GridSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { slotIndex },
  });

  return (
    <div ref={setNodeRef} className="relative h-full w-full">
      {isEmpty ? (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center border border-dashed rounded-md transition-colors",
            isEditMode
              ? "border-muted-foreground/40 text-muted-foreground/60"
              : "border-transparent",
            isOver && "border-primary bg-primary/10",
          )}
        >
          {isEditMode && (
            <span className="text-xs select-none">Drop tool here</span>
          )}
        </div>
      ) : (
        <>
          {children}
          {isEditMode && isOver && (
            <div className="pointer-events-none absolute inset-0 z-20 rounded-md border-2 border-primary bg-primary/10" />
          )}
        </>
      )}
    </div>
  );
}
