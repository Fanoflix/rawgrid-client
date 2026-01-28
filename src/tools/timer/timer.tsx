import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTimer } from "@/tools/timer/lib/use-timer";

export function TimerTool() {
  const {
    state,
    displayValue,
    handleInputChange,
    handlePlay,
    handlePause,
    handleStop,
  } = useTimer();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex w-full gap-0 border-b border-border flex-col items-center justify-center">
        <Input
          value={state.input}
          onChange={handleInputChange}
          placeholder="seconds or mm:ss"
          className="rounded-none font-mono w-1/2 min-w-[100px]"
        />
        <div className="flex gap-0 items-center justify-center">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="rounded-none border-y-border border-r-border"
            onClick={handlePlay}
            disabled={state.status === "running"}
          >
            play
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="rounded-none border-y-border border-r-border"
            onClick={handlePause}
            disabled={state.status !== "running"}
          >
            pause
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="rounded-none border-y-border"
            onClick={handleStop}
            disabled={state.status === "idle"}
          >
            stop
          </Button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center font-mono text-lg">
        {displayValue}
      </div>
    </div>
  );
}
