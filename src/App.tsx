import { Fragment, useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { CommandPalette } from "@/components/command-palette";
import { DragOverlayContent } from "@/components/drag-overlay-content";
import { DraggableTool } from "@/components/draggable-tool";
import { GridSlot } from "@/components/grid-slot";
import { TopNavbar } from "@/components/top-navbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { subscribe } from "@/lib/command-bus";
import { ghostModifier } from "@/lib/drag-ghost";
import {
  GRID_TREE,
  type GridGroupNode,
  type GridNode,
} from "@/lib/layout-config";
import { useLayout } from "@/lib/use-layout";
import { useThemeToggle } from "@/lib/use-theme-toggle";
import type { ToolId } from "@/lib/tool-registry";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

export function App() {
  const layoutState = useLayout();
  const {
    toolsBySlot,
    hiddenSlots,
    canHideSlot,
    isEditMode,
    swapSlots,
    hideSlot,
  } = layoutState;

  const { isDark, toggleTheme } = useThemeToggle();
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);

  useEffect(() => {
    const unsubscribers = [
      subscribe("theme:dark", () => { if (!isDark) toggleTheme(); }),
      subscribe("theme:light", () => { if (isDark) toggleTheme(); }),
      subscribe("layout:reset", () => layoutState.resetLayout()),
      subscribe("layout:edit", () =>
        layoutState.setEditMode((isEditing) => !isEditing)
      ),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveToolId(event.active.data.current?.toolId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveToolId(null);
    const { active, over } = event;
    if (!over) return;

    const fromSlot = active.data.current?.slotIndex as number;
    const toSlot = over.data.current?.slotIndex as number;

    if (fromSlot !== undefined && toSlot !== undefined && fromSlot !== toSlot) {
      swapSlots(fromSlot, toSlot);
    }
  }

  function renderSlot(slotIndex: number) {
    const toolId = toolsBySlot[slotIndex];

    return (
      <GridSlot
        slotIndex={slotIndex}
        isEditMode={isEditMode}
        canHide={canHideSlot}
        onHide={() => hideSlot(slotIndex)}
      >
        <DraggableTool
          toolId={toolId}
          slotIndex={slotIndex}
          isEditMode={isEditMode}
        >
          {renderToolComponent(toolId)}
        </DraggableTool>
      </GridSlot>
    );
  }

  function isNodeVisible(node: GridNode): boolean {
    if (node.kind === "slot") return !hiddenSlots.includes(node.slot);
    return node.children.some(isNodeVisible);
  }

  function getNodeId(node: GridNode) {
    return node.kind === "slot" ? `slot-${node.slot}` : node.id;
  }

  // Hidden spaces aren't rendered at all; the visible siblings' sizes are
  // rescaled to fill 100% of the group. Panels keep stable ids, so the group
  // re-lays itself out as they come and go without remounting the others.
  function renderGroup(group: GridGroupNode, className: string): ReactNode {
    const visibleChildren = group.children.filter(isNodeVisible);
    const totalSize = visibleChildren.reduce((sum, child) => sum + child.size, 0);

    return (
      <ResizablePanelGroup direction={group.direction} className={className}>
        {visibleChildren.map((child, index) => {
          const childId = getNodeId(child);
          return (
            <Fragment key={childId}>
              {index > 0 && <ResizableHandle />}
              <ResizablePanel
                id={childId}
                defaultSize={`${(child.size / totalSize) * 100}%`}
                minSize={`${child.minSize}%`}
              >
                {child.kind === "slot"
                  ? renderSlot(child.slot)
                  : renderGroup(child, "h-full w-full")}
              </ResizablePanel>
            </Fragment>
          );
        })}
      </ResizablePanelGroup>
    );
  }

  function renderToolComponent(toolId: ToolId) {
    const entry = TOOL_REGISTRY[toolId];
    if (!entry) return null;
    const Component = entry.component;
    return <Component />;
  }

  return (
    <DndContext
      sensors={sensors}
      // The target is whatever space is under the cursor, since the ghost
      // changes size and would otherwise overlap several spaces.
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen w-full flex-col bg-background text-foreground">
        <TopNavbar layoutState={layoutState} />
        {/* The top edge belongs to the grid, not to whichever tool lands up there. */}
        <div className="min-h-0 flex-1 border-t border-foreground/30">
          {renderGroup(
            GRID_TREE,
            "overflow-y-auto min-h-full w-full max-w-screen"
          )}
        </div>
      </div>

      <DragOverlay
        modifiers={[ghostModifier]}
        dropAnimation={{
          duration: 50,
          easing: "cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      >
        {activeToolId ? (
          <DragOverlayContent toolName={TOOL_REGISTRY[activeToolId].name} />
        ) : null}
      </DragOverlay>

      <CommandPalette />
    </DndContext>
  );
}

export default App;
