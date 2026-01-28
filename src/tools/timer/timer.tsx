import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimer } from "@/tools/timer/lib/use-timer";

export function TimerTool() {
  const {
    state,
    displayParts,
    isInputLocked,
    handleInputChange,
    handleInputBlur,
    handlePlay,
    handlePause,
    handleStop,
  } = useTimer();

  const inputClassName = [
    "w-12 min-w-[48px] text-center font-mono text-lg rounded-none",
    "focus-visible:ring-0 focus-visible:ring-offset-0",
    isInputLocked ? "border-0 bg-transparent shadow-none" : "border-border",
  ].join(" ");

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <div className="flex items-center justify-center gap-0.25 font-mono text-lg">
        <Input
          value={displayParts.hours}
          onChange={handleInputChange("hours")}
          onBlur={handleInputBlur("hours")}
          readOnly={isInputLocked}
          className={inputClassName}
          inputMode="numeric"
        />
        <span className="text-muted-foreground text-xs">:</span>
        <Input
          value={displayParts.minutes}
          onChange={handleInputChange("minutes")}
          onBlur={handleInputBlur("minutes")}
          readOnly={isInputLocked}
          className={inputClassName}
          inputMode="numeric"
        />
        <span className="text-muted-foreground text-xs">:</span>
        <Input
          value={displayParts.seconds}
          onChange={handleInputChange("seconds")}
          onBlur={handleInputBlur("seconds")}
          readOnly={isInputLocked}
          className={inputClassName}
          inputMode="numeric"
        />
      </div>
      <div className="flex items-center justify-center gap-0">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="rounded-none border-border"
          onClick={handlePlay}
          disabled={state.status === "running"}
        >
          play
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="rounded-none border-y-border"
          onClick={handlePause}
          disabled={state.status !== "running"}
        >
          pause
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="rounded-none border-border"
          onClick={handleStop}
          disabled={state.status === "idle"}
        >
          stop
        </Button>
      </div>
    </div>
  );
}
