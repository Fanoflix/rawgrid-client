import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { X } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { FontSizeButtons } from "@/components/font-size-buttons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFont } from "@/lib/use-font";
import { useStackedTextareasWithCommands as useStackedTextareas } from "@/tools/stacked-textareas/lib/use-stacked-textareas-commands";

export function StackedTextareasTool() {
  const {
    entries,
    canRemove,
    getEntryChangeHandler,
    getEntryRemoveHandler,
    setEntryValue,
    handleAddEntry,
  } = useStackedTextareas();

  const now = useCurrentTimestamp();
  const formattedNow = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now),
    [now]
  );
  const timeZone = useMemo(
    () => new Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local",
    []
  );
  const headerInfo = useMemo(
    () =>
      [
        formattedNow,
        timeZone,
        `${entries.map((entry) => entry.trim()).filter(Boolean).length} notes`,
      ].join(" | "),
    [entries, formattedNow, timeZone]
  );

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-1 py-0.5">
        <span className="text-[10px] text-muted-foreground font-mono">
          {headerInfo}
        </span>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleAddEntry}
          aria-label="add textarea"
        >
          add text area
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {entries.map((value, index) => (
          <StackedTextareaRow
            key={`${index}-textarea`}
            value={value}
            onChange={getEntryChangeHandler(index)}
            onRemove={getEntryRemoveHandler(index)}
            onTransform={(nextValue) => setEntryValue(index, nextValue)}
            canRemove={canRemove}
          />
        ))}
      </div>
    </div>
  );
}

function useCurrentTimestamp() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return now;
}

interface StackedTextareaRowProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onRemove: () => void;
  onTransform: (nextValue: string) => void;
  canRemove: boolean;
}

function StackedTextareaRow({
  value,
  onChange,
  onRemove,
  onTransform,
  canRemove,
}: StackedTextareaRowProps) {
  const { fontSize, increaseFont, decreaseFont } = useFont({
    defaultSize: 12,
    minSize: 10,
    maxSize: 36,
  });

  return (
    <div className="relative group shrink-0">
      <Textarea
        value={value}
        onChange={onChange}
        placeholder="notes, ideas, todos..."
        className="block w-full resize-y rounded-none border-b border-b-border pt-6 px-4"
        style={{ fontSize }}
      />
      <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={value} ariaLabel="copy text" />
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="border-l-0 px-2"
          onClick={() => onTransform(toCapitalized(value))}
          aria-label="capitalize"
        >
          capitalize
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="border-l-0 px-2"
          onClick={() => onTransform(value.toUpperCase())}
          aria-label="all caps"
        >
          all caps
        </Button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="border-l-0 px-2"
          onClick={() => onTransform(value.toLowerCase())}
          aria-label="all lowercase"
        >
          all lowercase
        </Button>
        <FontSizeButtons
          onIncrease={increaseFont}
          onDecrease={decreaseFont}
          isJoinedToPreviousButton
        />
        {canRemove ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            className="border-l-0"
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
