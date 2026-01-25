import { createContext, useContext } from "react"
import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type SeparatorProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizableDirection = "horizontal" | "vertical"

const ResizableDirectionContext = createContext<ResizableDirection>("horizontal")

export interface ResizablePanelGroupProps
  extends Omit<GroupProps, "orientation"> {
  direction?: ResizableDirection
}

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  ...props
}: ResizablePanelGroupProps) {
  return (
    <ResizableDirectionContext.Provider value={direction}>
      <Group
        orientation={direction}
        className={cn(
          "flex h-full w-full",
          direction === "vertical" ? "flex-col" : "flex-row",
          className
        )}
        {...props}
      />
    </ResizableDirectionContext.Provider>
  )
}

const ResizablePanel = Panel

function ResizableHandle({
  className,
  withHandle = false,
  ...props
}: SeparatorProps & { withHandle?: boolean }) {
  const direction = useContext(ResizableDirectionContext)
  const isVertical = direction === "vertical"

  return (
    <Separator
      className={cn(
        "bg-border focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-1 relative flex items-center justify-center",
        isVertical ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="bg-border pointer-events-none size-3" />
      ) : null}
    </Separator>
  )
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
