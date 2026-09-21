import type { ChangeEvent } from "react";
import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { FontSizeButtons } from "@/components/font-size-buttons";
import { ToolInfo } from "@/components/tool-info";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useBase64WithCommands as useBase64 } from "@/tools/base64/lib/use-base64-commands";

export function Base64Tool() {
  const {
    state,
    handleEncodedChange,
    handleDecodedChange,
    decode,
    encode,
    increaseFont,
    decreaseFont,
  } = useBase64();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex h-8 items-center gap-1 border-b border-border px-1">
        <ToolInfo
          name="base64"
          description="encode text to base64 and decode it back."
          triggerText="help"
          detailed="left box holds base64, right box holds plain text. the boxes do not update each other as you type — press decode or encode to move a value across. utf-8 safe, url-safe base64 accepted."
        />

        {!state.isInSync && (
          <span
            role="status"
            className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground"
          >
            <TriangleAlert className="size-3 shrink-0 text-destructive" />
            <span className="truncate">out of sync</span>
          </span>
        )}
        <span className="ml-auto flex gap-0">
          <FontSizeButtons onIncrease={increaseFont} onDecrease={decreaseFont} />
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <Base64Box
          label="base64"
          value={state.encoded}
          onChange={handleEncodedChange}
          placeholder="base64"
          error={state.encodedError}
          fontSize={state.fontSize}
          actionLabel="decode"
          actionIcon={<ArrowRight className="size-3" />}
          onAction={() => decode()}
          copyLabel="copy base64"
          isInSync={state.isInSync}
        />
        <Base64Box
          label="plain text"
          value={state.decoded}
          onChange={handleDecodedChange}
          placeholder="plain text"
          error={state.decodedError}
          fontSize={state.fontSize}
          actionLabel="encode base64"
          actionIcon={<ArrowLeft className="size-3" />}
          onAction={() => encode()}
          copyLabel="copy plain text"
          isInSync={state.isInSync}
          className="border-l border-border"
        />
      </div>
    </div>
  );
}

interface Base64BoxProps {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  error: string | null;
  fontSize: number;
  actionLabel: string;
  actionIcon: React.ReactNode;
  onAction: () => void;
  copyLabel: string;
  isInSync: boolean;
  className?: string;
}

function Base64Box({
  label,
  value,
  onChange,
  placeholder,
  error,
  fontSize,
  actionLabel,
  actionIcon,
  onAction,
  copyLabel,
  isInSync,
  className,
}: Base64BoxProps) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col", className)}>
      <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border px-1">
        <span className="bg-accent/50 p-1 font-mono text-[10px] text-muted-foreground">
          {label}
        </span>
        <Button
          type="button"
          variant={isInSync ? "secondary" : "default"}
          size="xs"
          className="ml-auto gap-1"
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionIcon}
          {actionLabel}
        </Button>
      </div>

      <div className="group relative min-h-0 flex-1">
        <Textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className="h-full max-w-full min-h-0 w-full resize-none overflow-x-hidden overflow-y-auto font-mono font-thin whitespace-pre-wrap wrap-break-word field-sizing-fixed"
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
