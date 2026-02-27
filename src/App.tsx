import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
import { useLayout } from "@/lib/use-layout";
import { useThemeToggle } from "@/lib/use-theme-toggle";
import type { ToolId } from "@/lib/tool-registry";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

export function App() {
  const layoutState = useLayout();
  const { layout, isEditMode, swapSlots, hideTool } = layoutState;

  const { isDark, toggleTheme } = useThemeToggle();
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);

  useEffect(() => {
    const unsubs = [
      subscribe("theme:dark", () => { if (!isDark) toggleTheme(); }),
      subscribe("theme:light", () => { if (isDark) toggleTheme(); }),
      subscribe("layout:reset", () => layoutState.resetLayout()),
      subscribe("layout:edit", () => layoutState.setEditMode((v) => !v)),
    ];
    return () => unsubs.forEach((fn) => fn());
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
    const toolId = layout[slotIndex] as ToolId | null;
    const isEmpty = toolId === null;

    return (
      <GridSlot slotIndex={slotIndex} isEditMode={isEditMode} isEmpty={isEmpty}>
        {toolId && (
          <DraggableTool
            toolId={toolId}
            slotIndex={slotIndex}
            isEditMode={isEditMode}
            onHide={() => hideTool(slotIndex)}
          >
            {renderToolComponent(toolId)}
          </DraggableTool>
        )}
      </GridSlot>
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen w-full flex-col bg-background text-foreground">
        <TopNavbar layoutState={layoutState} />
        <div className="min-h-0 flex-1">
          <ResizablePanelGroup
            direction="vertical"
            className="overflow-y-auto min-h-full w-full max-w-screen"
          >
            <ResizablePanel defaultSize={15} minSize={15}>
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full"
              >
                <ResizablePanel defaultSize={15} minSize={15}>
                  <ResizablePanelGroup
                    direction="vertical"
                    className="h-full w-full"
                  >
                    <ResizablePanel defaultSize={12} minSize={12}>
                      {renderSlot(0)}
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel defaultSize={5} minSize={5}>
                      {renderSlot(1)}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={15} minSize={15}>
                  {renderSlot(2)}
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={10} minSize={5}>
                  <ResizablePanelGroup
                    direction="vertical"
                    className="h-full w-full"
                  >
                    <ResizablePanel defaultSize={10} minSize={5}>
                      {renderSlot(3)}
                    </ResizablePanel>

                    <ResizableHandle />

                    <ResizablePanel defaultSize={10} minSize={5}>
                      {renderSlot(4)}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={10} minSize={10}>
                  {renderSlot(5)}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize={25} minSize={15}>
              <ResizablePanelGroup
                direction="horizontal"
                className="h-full w-full"
              >
                <ResizablePanel defaultSize={15} minSize={15}>
                  {renderSlot(6)}
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel defaultSize={40} minSize={20}>
                  {renderSlot(7)}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <DragOverlay
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
