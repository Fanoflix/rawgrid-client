import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ToolBaseContainerProps {
  children: ReactNode;
  className?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  style?: CSSProperties;
}

export function ToolBaseContainer({
  children,
  className,
}: ToolBaseContainerProps) {
  return <div className={cn("contents", className)}>{children}</div>;
}
