import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface ToolBaseContainerProps {
  children: ReactNode
  className?: string
  defaultWidth?: number
  defaultHeight?: number
  style?: CSSProperties
}

export function ToolBaseContainer({
  children,
  className,
  defaultWidth = 420,
  defaultHeight = 320,
  style,
}: ToolBaseContainerProps) {
  return (
    <div
      className={cn(
        "tool-base border-border flex h-full w-full flex-col border lowercase overflow-hidden",
        className
      )}
      style={{
        minWidth: defaultWidth,
        minHeight: defaultHeight,
        containerType: "inline-size",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
