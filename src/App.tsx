import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import { FocusTabs } from "@/components/focus-tabs";
import { GridSlot } from "@/components/grid-slot";
import { TopNavbar } from "@/components/top-navbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { dispatch, subscribe } from "@/lib/command-bus";
import { ghostModifier } from "@/lib/drag-ghost";
import { FONT_COMMANDS, HOVER_COMMAND } from "@/lib/tool-hover";
import {
  FOCUS_TABS_HEIGHT,
  getGridNodeId,
  GRID_TREE,
  isToolId,
  resolveGroupLayout,
  type GridGroupNode,
  type GridNode,
} from "@/lib/layout-config";
import { useLayout } from "@/lib/use-layout";
import { useThemeToggle } from "@/lib/use-theme-toggle";
import { cn } from "@/lib/utils";
import type { ToolId } from "@/lib/tool-registry";
import { TOOL_REGISTRY } from "@/lib/tool-registry";

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const FONT_HOTKEY_CODES: Record<string, keyof typeof FONT_COMMANDS | undefined> = {
  Equal: "increase",
  NumpadAdd: "increase",
  Minus: "decrease",
  NumpadSubtract: "decrease",
};

export function App() {
  const layoutState = useLayout();
  const {
    toolsBySlot,
    hiddenSlots,
    panelSizes,
    focusedToolId,
    layoutVersion,
    isReady: isLayoutReady,
    canHideSlot,
    isEditMode,
    swapSlots,
    hideSlot,
    setPanelSizes,
    focusTool,
    exitFocus,
    isToolVisible,
  } = layoutState;

  const { setTheme } = useThemeToggle();
  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const hoveredToolRef = useRef<ToolId | null>(null);
  const [focusTop, setFocusTop] = useState(0);

  useEffect(() => {
    const unsubscribers = [
      subscribe("theme:dark", () => setTheme(true)),
      subscribe("theme:light", () => setTheme(false)),
      subscribe("layout:reset", () => layoutState.resetLayout()),
      subscribe("layout:edit", () =>
        layoutState.setEditMode(!layoutState.isEditMode)
      ),
      subscribe("layout:focus", (toolId) => {
        if (toolId && isToolId(toolId)) focusTool(toolId);
      }),
      subscribe("layout:unfocus", () => exitFocus()),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => setFocusTop(grid.getBoundingClientRect().top);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [isLayoutReady]);

  useEffect(
    () =>
      subscribe(HOVER_COMMAND, (toolId) => {
        hoveredToolRef.current = toolId && isToolId(toolId) ? toolId : null;
      }),
    []
  );

  useEffect(() => {
    function handleFontHotkey(event: KeyboardEvent) {
      const hasModifier = IS_MAC ? event.metaKey : event.ctrlKey;
      if (!hasModifier || !event.shiftKey) return;
      const direction = FONT_HOTKEY_CODES[event.code];
      if (!direction) return;
      event.preventDefault();
      const target = hoveredToolRef.current ?? focusedToolId;
      if (target) dispatch(FONT_COMMANDS[direction], target);
    }
    window.addEventListener("keydown", handleFontHotkey);
    return () => window.removeEventListener("keydown", handleFontHotkey);
  }, [focusedToolId]);

  useEffect(() => {
    if (focusedToolId === null) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        event.target instanceof Element &&
        event.target.closest("input, textarea, [contenteditable=true]")
      ) {
        return;
      }
      exitFocus();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedToolId, exitFocus]);

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
        isFocused={focusedToolId === toolId}
        focusTop={focusTop + FOCUS_TABS_HEIGHT}
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

  const focusedSlot =
    focusedToolId === null ? -1 : toolsBySlot.indexOf(focusedToolId);

  function isNodeVisible(node: GridNode): boolean {
    if (node.kind === "slot") {
      return node.slot === focusedSlot || !hiddenSlots.includes(node.slot);
    }
    return node.children.some(isNodeVisible);
  }

  function handleGroupLayoutChanged(sizes: Record<string, number>) {
    if (focusedToolId === null) setPanelSizes(sizes);
  }

  // Hidden spaces aren't rendered at all; the visible siblings' sizes are
  // rescaled to fill 100% of the group. Panels keep stable ids, so the group
  // re-lays itself out as they come and go without remounting the others.
  function renderGroup(group: GridGroupNode, className: string): ReactNode {
    const visibleChildren = group.children.filter(isNodeVisible);
    const totalSize = visibleChildren.reduce((sum, child) => sum + child.size, 0);

    return (
      <ResizablePanelGroup
        id={group.id}
        direction={group.direction}
        className={className}
        defaultLayout={resolveGroupLayout(visibleChildren, panelSizes)}
        onLayoutChanged={handleGroupLayoutChanged}
      >
        {visibleChildren.map((child, index) => {
          const childId = getGridNodeId(child);
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
        <div
          key={layoutVersion}
          ref={gridRef}
          className={cn(
            "min-h-0 flex-1 border-t border-foreground/30",
            focusedToolId !== null && "invisible"
          )}
        >
          {isLayoutReady &&
            renderGroup(
              GRID_TREE,
              "overflow-y-auto min-h-full w-full max-w-screen"
            )}
          {focusedToolId !== null && (
            <FocusTabs
              top={focusTop}
              toolIds={toolsBySlot.filter((_, slot) => !hiddenSlots.includes(slot))}
              hiddenToolIds={toolsBySlot.filter((_, slot) => hiddenSlots.includes(slot))}
              focusedToolId={focusedToolId}
              onSelect={focusTool}
            />
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

      <CommandPalette
        focusedToolId={focusedToolId}
        isToolVisible={isToolVisible}
        onExitFocus={exitFocus}
      />
    </DndContext>
  );
}

export default App;
