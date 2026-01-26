import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "disabled:bg-input/50 dark:disabled:bg-input/80 rounded-none bg-transparent px-2.5 py-2 text-xs transition-colors md:text-xs placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full disabled:cursor-not-allowed disabled:opacity-50 focus:bg-accent dark:focus:bg-accent/25",
        "focus:ring-0 ring-0 focus:outline-none outline-none",
        "border border-transparent focus:border-primary/50",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
