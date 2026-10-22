import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  value: string;
  className?: string;
  ariaLabel?: string;
  isIconOnly?: boolean;
}

export function CopyButton({
  value,
  className,
  ariaLabel = "copy",
  isIconOnly = false,
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1200);
  }

  if (isIconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(
          "text-muted-foreground",
          isCopied && "text-green-500 hover:text-green-500",
          className
        )}
        onClick={handleCopy}
        aria-label={isCopied ? "copied" : ariaLabel}
      >
        {isCopied ? <Check /> : <Copy />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      className={cn(
        isCopied && "text-green-500 hover:text-green-500",
        className
      )}
      onClick={handleCopy}
      aria-label={ariaLabel}
    >
      <span className="grid">
        <span className={cn("col-start-1 row-start-1", isCopied && "invisible")}>
          copy
        </span>
        <span className={cn("col-start-1 row-start-1", !isCopied && "invisible")}>
          copied
        </span>
      </span>
    </Button>
  );
}
