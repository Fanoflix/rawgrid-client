import { GripVertical } from "lucide-react";

interface DragOverlayContentProps {
  toolName: string;
}

export function DragOverlayContent({ toolName }: DragOverlayContentProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 shadow-lg">
      <GripVertical className="size-3.5 text-muted-foreground" />
      <span className="text-sm font-medium">{toolName}</span>
    </div>
  );
}
