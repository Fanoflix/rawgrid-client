import { FOCUS_TABS_HEIGHT } from "@/lib/layout-config";
import { cn } from "@/lib/utils";
import { TOOL_REGISTRY, type ToolId } from "@/lib/tool-registry";

interface FocusTabsProps {
  top: number;
  toolIds: ToolId[];
  hiddenToolIds: ToolId[];
  focusedToolId: ToolId;
  onSelect: (toolId: ToolId) => void;
}

export function FocusTabs({
  top,
  toolIds,
  hiddenToolIds,
  focusedToolId,
  onSelect,
}: FocusTabsProps) {
  function renderTab(toolId: ToolId, isHidden: boolean) {
    const isActive = toolId === focusedToolId;
    return (
      <button
        key={toolId}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => onSelect(toolId)}
        className={cn(
          "h-7 shrink-0 cursor-pointer border-b-2 px-2.5 text-xs transition-colors",
          isActive
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
          isHidden && "opacity-40 hover:opacity-100"
        )}
      >
        {TOOL_REGISTRY[toolId].name.toLowerCase()}
      </button>
    );
  }

  return (
    <div
      role="tablist"
      style={{ top, height: FOCUS_TABS_HEIGHT }}
      className="visible fixed inset-x-0 z-30 flex items-end gap-0 overflow-x-auto border-b border-border bg-background px-1 [scrollbar-width:none]"
    >
      {toolIds.map((toolId) => renderTab(toolId, false))}
      {hiddenToolIds.length > 0 && (
        <span className="mx-1 mb-1.5 h-4 w-px shrink-0 bg-border" />
      )}
      {hiddenToolIds.map((toolId) => renderTab(toolId, true))}
    </div>
  );
}
