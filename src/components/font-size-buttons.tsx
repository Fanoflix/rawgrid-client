import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FontSizeButtonsProps {
  onIncrease: () => void;
  onDecrease: () => void;
  isJoinedToPreviousButton?: boolean;
}

export function FontSizeButtons({
  onIncrease,
  onDecrease,
  isJoinedToPreviousButton = false,
}: FontSizeButtonsProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className={cn(isJoinedToPreviousButton && "border-l-0")}
        onClick={onIncrease}
        aria-label="increase font"
      >
        <Plus className="size-3" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        className="border-l-0"
        onClick={onDecrease}
        aria-label="decrease font"
      >
        <Minus className="size-3" />
      </Button>
    </>
  );
}
