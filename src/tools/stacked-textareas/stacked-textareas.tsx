import type { ChangeEvent } from "react";
import { Minus, Plus, X } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFont } from "@/lib/use-font";
import { useStackedTextareas } from "@/tools/stacked-textareas/lib/use-stacked-textareas";

export function StackedTextareasTool() {
  const {
    entries,
    canRemove,
    canAdd,
    getEntryChangeHandler,
    getEntryRemoveHandler,
    setEntryValue,
    handleAddEntry,
  } = useStackedTextareas();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex h-8 items-center justify-end border-b border-border px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="border-border bg-background text-foreground hover:bg-muted rounded-none border"
          onClick={handleAddEntry}
          aria-label="add textarea"
          disabled={!canAdd}
        >
          <Plus className="size-3" />
        </Button>
      </div>
      {entries.map((value, index) => (
        <StackedTextareaRow
          key={`${index}-textarea`}
          value={value}
          onChange={getEntryChangeHandler(index)}
          onRemove={getEntryRemoveHandler(index)}
          onTransform={(nextValue) => setEntryValue(index, nextValue)}
          canRemove={canRemove}
          canResize={entries.length > 1}
        />
      ))}
    </div>
  );
}

interface StackedTextareaRowProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onRemove: () => void;
  onTransform: (nextValue: string) => void;
  canRemove: boolean;
  canResize: boolean;
}

function StackedTextareaRow({
  value,
  onChange,
  onRemove,
  onTransform,
  canRemove,
  canResize,
}: StackedTextareaRowProps) {
  const { fontSize, increaseFont, decreaseFont } = useFont({
    defaultSize: 12,
    minSize: 10,
    maxSize: 18,
  });

  return (
    <div className="relative group flex-1">
      <Textarea
        value={value}
        onChange={onChange}
        placeholder="notes, ideas, todos..."
        className="h-full w-full resize-y rounded-none border-b border-b-border"
        style={{
          resize: canResize ? "vertical" : "none",
          fontSize,
        }}
      />
      <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={value} ariaLabel="copy text" />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="border-border bg-background text-foreground hover:bg-muted rounded-none border border-l-0 px-2"
          onClick={() => onTransform(toCapitalized(value))}
          aria-label="capitalize"
        >
          capitalize
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="border-border bg-background text-foreground hover:bg-muted rounded-none border border-l-0 px-2"
          onClick={() => onTransform(value.toUpperCase())}
          aria-label="all caps"
        >
          all caps
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="border-border bg-background text-foreground hover:bg-muted rounded-none border border-l-0 px-2"
          onClick={() => onTransform(value.toLowerCase())}
          aria-label="all lowercase"
        >
          all lowercase
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="border-border bg-background text-foreground hover:bg-muted rounded-none border border-l-0"
          onClick={increaseFont}
          aria-label="increase font"
        >
          <Plus className="size-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="border-border bg-background text-foreground hover:bg-muted rounded-none border border-l-0"
          onClick={decreaseFont}
          aria-label="decrease font"
        >
          <Minus className="size-3" />
        </Button>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="border-border bg-background text-foreground hover:bg-muted rounded-none border border-l-0"
            onClick={onRemove}
            aria-label="remove text"
          >
            <X className="size-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function toCapitalized(value: string) {
  return value.replace(/\b\p{L}+/gu, (word) => {
    const [firstChar, ...rest] = word;
    if (!firstChar) return word;
    return `${firstChar.toUpperCase()}${rest.join("").toLowerCase()}`;
  });
}
