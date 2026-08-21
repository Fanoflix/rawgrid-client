import type { ChangeEvent, ReactNode } from "react";
import { useRef } from "react";
import { Minus, Plus, X } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { ToolInfo } from "@/components/tool-info";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { IndentId } from "@/tools/json-prettify/lib/constants";
import { formatBytes } from "@/tools/json-prettify/lib/utils";
import { useJsonPrettifyWithCommands as useJsonPrettify } from "@/tools/json-prettify/lib/use-json-prettify-commands";

export function JsonPrettifyTool() {
  const {
    state,
    indentOptions,
    handleInputChange,
    handleOutputChange,
    handleIndentChange,
    setMode,
    toggleSortKeys,
    clearPane,
    increaseFont,
    decreaseFont,
  } = useJsonPrettify();

  const isMinified = state.mode === "minified";
  const statsLabel = state.output
    ? `${state.stats.lines} lines | ${formatBytes(state.stats.bytes)}`
    : "";

  return (
    <div className="flex h-full w-full flex-col gap-0 overflow-hidden">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-1">
        <ToolInfo
          name="json prettify"
          description="format messy json, or squash it back down."
          triggerText="help"
          detailed="both panes are editable — type in either one and the other rebuilds shortly after you stop. pick an indent, toggle minify to strip whitespace, or sort keys a-z. parse errors point at the line and column."
        />

        <Select
          value={state.indent}
          onValueChange={(value) =>
            handleIndentChange((value ?? "2") as IndentId)
          }
        >
          <SelectTrigger className="h-6 rounded-none border-border bg-background text-xs">
            <SelectValue placeholder="indent" />
          </SelectTrigger>
          <SelectContent>
            {indentOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={isMinified ? "default" : "outline"}
          size="xs"
          onClick={() => setMode(isMinified ? "pretty" : "minified")}
          aria-pressed={isMinified}
        >
          minify
        </Button>

        <Button
          type="button"
          variant={state.sortKeys ? "default" : "outline"}
          size="xs"
          onClick={toggleSortKeys}
          aria-pressed={state.sortKeys}
        >
          sort keys
        </Button>

        {state.isPending && (
          <span
            role="status"
            className="font-mono text-[10px] text-muted-foreground"
          >
            syncing…
          </span>
        )}

        <span className="ml-auto flex gap-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-none border border-border bg-background text-foreground hover:bg-muted"
            onClick={increaseFont}
            aria-label="increase font"
          >
            <Plus className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-none border border-l-0 border-border bg-background text-foreground hover:bg-muted"
            onClick={decreaseFont}
            aria-label="decrease font"
          >
            <Minus className="size-3" />
          </Button>
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          <ResizablePanel defaultSize={50} minSize={20}>
            <JsonPane
              label="input"
              value={state.input}
              onChange={handleInputChange}
              placeholder="paste json"
              error={state.inputError}
              fontSize={state.fontSize}
              isStale={state.isPending && state.source !== "input"}
              onClear={() => clearPane("input")}
              copyLabel="copy input json"
            />
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={50} minSize={20}>
            <JsonPane
              label={isMinified ? "minified" : "prettified"}
              info={statsLabel}
              value={state.output}
              onChange={handleOutputChange}
              placeholder="formatted json"
              error={state.outputError}
              fontSize={state.fontSize}
              isStale={state.isPending && state.source !== "output"}
              onClear={() => clearPane("output")}
              copyLabel="copy formatted json"
              className="border-l border-border"
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

interface JsonPaneProps {
  label: string;
  info?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  error: string | null;
  fontSize: number;
  isStale: boolean;
  onClear: () => void;
  copyLabel: string;
  className?: string;
}

function JsonPane({
  label,
  info,
  value,
  onChange,
  placeholder,
  error,
  fontSize,
  isStale,
  onClear,
  copyLabel,
  className,
}: JsonPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleClear() {
    const textarea = textareaRef.current;
    if (!textarea || !textarea.value) return;

    // Clear through the browser's own editing command so the deletion lands on
    // the textarea's native undo stack and ctrl+z brings the text back.
    textarea.focus();
    textarea.setSelectionRange(0, textarea.value.length);
    const isUndoable = document.execCommand("delete");

    // Older engines without execCommand still get a clear, just not undoable.
    if (!isUndoable) onClear();
  }

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <PanelHeader label={label} info={info}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="rounded-none border border-border bg-background text-foreground hover:bg-muted"
          onClick={handleClear}
          aria-label={`clear ${label}`}
        >
          <X className="size-3" />
        </Button>
      </PanelHeader>

      <div
        className={cn(
          "group relative min-h-0 flex-1",
          isStale && "opacity-60 transition-opacity"
        )}
      >
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className="h-full w-full min-h-0 resize-none rounded-none font-mono font-thin field-sizing-fixed"
          style={{ fontSize }}
        />
        <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton value={value} ariaLabel={copyLabel} />
        </div>
      </div>

      {error && (
        <p className="shrink-0 border-t border-border bg-destructive/10 px-1 py-1 font-mono text-[10px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface PanelHeaderProps {
  label: string;
  info?: string;
  children?: ReactNode;
}

function PanelHeader({ label, info, children }: PanelHeaderProps) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border px-1">
      <span className="bg-accent/50 p-1 font-mono text-[10px] text-muted-foreground">
        {label}
      </span>
      {info && (
        <span className="truncate font-mono text-[10px] text-muted-foreground/70">
          {info}
        </span>
      )}
      <span className="ml-auto flex gap-0">{children}</span>
    </div>
  );
}
