import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  value: string;
  className?: string;
  ariaLabel?: string;
}

export function CopyButton({
  value,
  className,
  ariaLabel = "copy",
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1200);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className={cn(
        "border-border bg-background text-foreground hover:bg-muted rounded-none border",
        isCopied && "text-green-500 hover:text-green-500",
        className
      )}
      onClick={handleCopy}
      aria-label={ariaLabel}
    >
      {isCopied ? "copied" : "copy"}
    </Button>
  );
}
