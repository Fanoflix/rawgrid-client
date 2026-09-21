import { useDndContext } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import { getDropTarget, getGhostSize } from "@/lib/drag-ghost";
import { cn } from "@/lib/utils";

interface DragOverlayContentProps {
  toolName: string;
}

// Sized explicitly rather than filling the DragOverlay wrapper (which dnd-kit
// sizes to the dragged space): clamped while floating, and matching the target
// space while over one. Positioning lives in `ghostModifier`.
export function DragOverlayContent({ toolName }: DragOverlayContentProps) {
  const { active, activeNodeRect, over } = useDndContext();
  if (!activeNodeRect) return null;

  const dropTarget = getDropTarget(active, over);
  const { width, height } = getGhostSize(activeNodeRect, dropTarget);

  return (
    <div
      style={{ width, height }}
      className={cn(
        "flex cursor-grabbing flex-col rounded-md border-2 border-primary border-dashed shadow-lg transition-[width,height] duration-100",
        // Over a target, the body stays clear so the space's drop highlight
        // shows through.
        dropTarget ? "bg-transparent" : "bg-background/60 backdrop-blur-[1px]"
      )}
    >
      <div className="flex items-center gap-1.5 border-primary/40 border-b border-dashed bg-background px-3 py-1.5">
        <GripVertical className="size-3.5 text-muted-foreground" />
        <span className="font-medium text-sm">{toolName}</span>
      </div>
    </div>
  );
}
