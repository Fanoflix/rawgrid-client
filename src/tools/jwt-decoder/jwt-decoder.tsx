import { Minus, Plus } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useJwtDecoder } from "@/tools/jwt-decoder/lib/use-jwt-decoder"

export function JwtDecoderTool() {
  const { state, handleTokenChange, increaseFont, decreaseFont } =
    useJwtDecoder()

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <Input
        value={state.token}
        onChange={handleTokenChange}
        placeholder="jwt"
        className="rounded-none border-0 border-b border-border font-mono truncate"
      />
      <div className="relative flex-1 group">
        <Textarea
          value={state.output}
          readOnly
          placeholder="decoded json"
          className="h-full w-full resize-none rounded-none border-0 border-t border-border font-mono"
          style={{ fontSize: state.fontSize }}
        />
        <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton value={state.output} ariaLabel="copy decoded json" />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="border-border bg-background text-foreground hover:bg-muted rounded-none border"
            onClick={increaseFont}
            aria-label="increase font"
          >
            <Plus className="size-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="border-border bg-background text-foreground hover:bg-muted rounded-none border"
            onClick={decreaseFont}
            aria-label="decrease font"
          >
            <Minus className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
