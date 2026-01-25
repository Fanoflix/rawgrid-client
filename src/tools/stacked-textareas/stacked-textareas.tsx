import { X } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStackedTextareas } from "@/tools/stacked-textareas/lib/use-stacked-textareas";

export function StackedTextareasTool() {
  const { entries, canRemove, getEntryChangeHandler, getEntryRemoveHandler } =
    useStackedTextareas();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      {entries.map((value, index) => (
        <div key={`${index}-textarea`} className="relative group flex-1">
          <Textarea
            value={value}
            onChange={getEntryChangeHandler(index)}
            placeholder="paste text"
            className="h-full w-full resize-y rounded-none border-0 border-b border-border"
            style={{
              resize: entries.length > 1 ? "vertical" : "none",
            }}
          />
          <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
            <CopyButton value={value} ariaLabel="copy text" />
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="border-border bg-background text-foreground hover:bg-muted rounded-none border"
                onClick={getEntryRemoveHandler(index)}
                aria-label="remove text"
              >
                <X className="size-3" />
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
