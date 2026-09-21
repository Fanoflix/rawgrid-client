import type { ReactNode } from "react";
import { useDndContext, useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { dispatch } from "@/lib/command-bus";
import { HOVER_COMMAND } from "@/lib/tool-hover";
import { ToolBaseContainer } from "@/components/tool-base-container";
import type { ToolId } from "@/lib/tool-registry";

interface DraggableToolProps {
  toolId: ToolId;
  slotIndex: number;
  isEditMode: boolean;
  children: ReactNode;
}

export function DraggableTool({
  toolId,
  slotIndex,
  isEditMode,
  children,
}: DraggableToolProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: toolId,
    data: { slotIndex, toolId },
    disabled: !isEditMode,
  });
  // While anything is being dragged, only the drop indicator should show.
  const { active } = useDndContext();

  return (
    <div
      ref={setNodeRef}
      className={cn("relative h-full w-full", isDragging && "opacity-30")}
      onMouseEnter={() => dispatch(HOVER_COMMAND, toolId)}
      onMouseLeave={() => dispatch(HOVER_COMMAND, "")}
    >
      {/* Faded in edit mode so it's obvious the grid, not the tools, is live. */}
      <div
        className={cn(
          "h-full w-full transition-opacity",
          isEditMode && "opacity-40"
        )}
      >
        <ToolBaseContainer>{children}</ToolBaseContainer>
      </div>

      {/* The whole space is the drag handle in edit mode. */}
      {isEditMode && (
        <div
          {...listeners}
          {...attributes}
          className={cn(
            "group/drag absolute inset-0 z-10 flex cursor-grab items-center justify-center transition-colors active:cursor-grabbing",
            !active && "hover:bg-primary/30"
          )}
        >
          {!active && (
            <span className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-foreground text-xs opacity-0 shadow-md transition-opacity select-none group-hover/drag:opacity-100">
              <GripVertical className="size-4" />
              Drag to move
            </span>
          )}
        </div>
      )}
    </div>
  );
}
