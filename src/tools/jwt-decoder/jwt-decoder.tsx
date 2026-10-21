import { CopyButton } from "@/components/copy-button";
import { FontSizeButtons } from "@/components/font-size-buttons";
import { Hint } from "@/components/hint";
import { ToolInfo } from "@/components/tool-info";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JsonEditor } from "@/components/json-editor";
import { useJwtDecoderWithCommands as useJwtDecoder } from "@/tools/jwt-decoder/lib/use-jwt-decoder-commands";

export function JwtDecoderTool() {
  const {
    state,
    handleTokenChange,
    handleOutputChange,
    confirmEdits,
    increaseFont,
    decreaseFont,
  } = useJwtDecoder();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div
        data-overflow-tooltip
        className="flex items-center border-b border-border px-1 h-8 gap-1"
      >
        <ToolInfo
          name="jwt decoder"
          description="decode jwt header + payload as json."
          triggerText="help"
          detailed={`paste a token like {"<header.payload.signature>"}, or edit the decoded json and hit "confirm edits" to rebuild the token. the signature is kept as-is, so an edited token won't verify.`}
        />
        <Input
          value={state.token}
          onChange={handleTokenChange}
          onKeyDown={(event) => {
            if (event.key === "Tab") event.preventDefault();
          }}
          placeholder="jwt"
          className="rounded-none text-xs font-medium truncate"
        />
        {state.hasDraft && (
          <Hint label={state.draftError ?? "rebuild the token from the edited json"}>
            <span className="shrink-0">
              <Button
                type="button"
                variant="primary-outline"
                size="xs"
                onClick={confirmEdits}
                disabled={state.draftError !== null}
              >
                {state.draftError ?? "confirm edits"}
              </Button>
            </span>
          </Hint>
        )}
      </div>
      <div className="relative flex-1 min-h-0 group">
        <JsonEditor
          value={state.editorJson}
          onChange={handleOutputChange}
          fontSize={state.fontSize}
          placeholder="decoded json"
          ariaLabel="decoded json"
        />
        <div className="absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
          <CopyButton
            value={state.editorJson}
            ariaLabel="copy decoded json"
          />
          <FontSizeButtons
            onIncrease={increaseFont}
            onDecrease={decreaseFont}
            isJoinedToPreviousButton
          />
        </div>
      </div>
    </div>
  );
}
