import { Minus, Plus } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { ToolInfo } from "@/components/tool-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useJwtDecoder } from "@/tools/jwt-decoder/lib/use-jwt-decoder";

export function JwtDecoderTool() {
  const { state, handleTokenChange, increaseFont, decreaseFont } =
    useJwtDecoder();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex items-center border px-1 h-8 border-x-transparent border-y-border gap-1">
        <ToolInfo
          name="jwt decoder"
          description="decode jwt header + payload as json."
          triggerText="help"
          detailed={`paste a token like {"<header.payload.signature>"}`}
        />
        <Input
          value={state.token}
          onChange={handleTokenChange}
          placeholder="jwt"
          className="rounded-none text-xs font-medium truncate"
        />
      </div>
      <div className="relative flex-1 min-h-0 group">
        <Textarea
          value={state.output}
          readOnly
          placeholder="decoded json"
          className="h-full w-full min-h-0 max-w-full resize-none font-mono font-thin overflow-y-auto overflow-x-hidden whitespace-pre-wrap wrap-break-word field-sizing-fixed cursor-default"
          style={{ fontSize: state.fontSize }}
        />
        <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton value={state.output} ariaLabel="copy decoded json" />
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
        </div>
      </div>
    </div>
  );
}
