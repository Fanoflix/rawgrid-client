import type { ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToolBaseContainer } from "@/components/tool-base-container";

interface DraggableToolProps {
  toolId: string;
  slotIndex: number;
  isEditMode: boolean;
  onHide: () => void;
  children: ReactNode;
}

export function DraggableTool({
  toolId,
  slotIndex,
  isEditMode,
  onHide,
  children,
}: DraggableToolProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: toolId,
    data: { slotIndex, toolId },
    disabled: !isEditMode,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn("relative h-full w-full", isDragging && "opacity-30")}
    >
      <ToolBaseContainer>{children}</ToolBaseContainer>

      {isEditMode && (
        <div className="absolute inset-0 z-10 rounded-md bg-background/50">
          {/* Drag handle */}
          <button
            {...listeners}
            {...attributes}
            className="absolute left-1.5 top-1.5 z-20 flex cursor-grab items-center gap-1 rounded border bg-background px-1.5 py-1 text-foreground shadow-md hover:bg-muted active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>

          {/* Hide button */}
          <button
            onClick={onHide}
            className="absolute right-1.5 top-1.5 z-20 rounded border bg-background p-1 text-foreground shadow-md hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
