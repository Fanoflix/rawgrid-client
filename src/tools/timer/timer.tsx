import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TIMER_PRESETS } from "@/tools/timer/lib/constants";
import { isTimerSoundId, TIMER_SOUNDS } from "@/tools/timer/lib/sounds";
import { useTimerWithCommands as useTimer } from "@/tools/timer/lib/use-timer-commands";

const soundItems = TIMER_SOUNDS.map((sound) => ({
  value: sound.id,
  label: sound.label,
}));

export function TimerTool() {
  const {
    state,
    displayParts,
    justFinished,
    isInputLocked,
    percentRemaining,
    isUrgent,
    canStart,
    handleInputChange,
    handleInputBlur,
    handleInputKeyDown,
    handlePlay,
    handlePause,
    handleStop,
    dismissFinished,
    setDuration,
    soundId,
    setSoundId,
  } = useTimer();

  const isRunning = state.status === "running";
  const isPaused = state.status === "paused";

  const inputClassName = cn(
    "w-11 min-w-0 border-border text-center font-mono text-lg tabular-nums rounded-none",
    "focus-visible:ring-0 focus-visible:ring-offset-0"
  );

  return (
    <div
      onClick={justFinished ? dismissFinished : undefined}
      className={cn(
        "relative flex h-full w-full flex-col transition-colors",
        isRunning && "bg-primary/5",
        justFinished && "animate-attention-surface cursor-pointer"
      )}
    >
      <Progress
        value={percentRemaining}
        aria-label="time remaining"
        className={cn(
          "h-1.5 shrink-0 transition-opacity",
          isInputLocked || justFinished ? "opacity-100" : "opacity-0"
        )}
        indicatorClassName={cn(
          "transition-[width] duration-200 ease-linear",
          isPaused && "bg-muted-foreground",
          isUrgent && "animate-pulse",
          justFinished && "animate-blink"
        )}
      />

      <div className="absolute top-2 right-1 z-10">
        <Select
          value={soundId}
          items={soundItems}
          onValueChange={(value) => {
            if (isTimerSoundId(value)) setSoundId(value);
          }}
        >
          <SelectTrigger
            aria-label="alarm sound"
            title="alarm sound"
            className="h-6 rounded-none border-border bg-background text-muted-foreground text-xs"
          >
            <Volume2 className="size-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMER_SOUNDS.map((sound) => (
              <SelectItem key={sound.id} value={sound.id}>
                {sound.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-2">
        {isInputLocked ? (
          <div
            role="timer"
            aria-live="off"
            className={cn(
              "font-mono text-3xl leading-none tabular-nums transition-colors",
              isRunning ? "text-primary" : "text-muted-foreground",
              isUrgent && "animate-pulse"
            )}
          >
            {displayParts.hours}:{displayParts.minutes}:{displayParts.seconds}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-0.25 font-mono text-lg">
            <Input
              value={displayParts.hours}
              data-part="hours"
              onChange={handleInputChange("hours")}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              onFocus={(event) => event.currentTarget.select()}
              className={inputClassName}
              inputMode="numeric"
              aria-label="hours"
            />
            <span className="text-muted-foreground text-xs">:</span>
            <Input
              value={displayParts.minutes}
              data-part="minutes"
              onChange={handleInputChange("minutes")}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              onFocus={(event) => event.currentTarget.select()}
              className={inputClassName}
              inputMode="numeric"
              aria-label="minutes"
            />
            <span className="text-muted-foreground text-xs">:</span>
            <Input
              value={displayParts.seconds}
              data-part="seconds"
              onChange={handleInputChange("seconds")}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              onFocus={(event) => event.currentTarget.select()}
              className={inputClassName}
              inputMode="numeric"
              aria-label="seconds"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-0">
          {isRunning ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="border-border"
              onClick={handlePause}
              aria-label="pause"
              title="pause"
            >
              <Pause className="fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              variant={isPaused ? "ghost" : "default"}
              size="icon-sm"
              className={cn(isPaused && "border-border")}
              onClick={handlePlay}
              disabled={!canStart}
              aria-label={isPaused ? "resume" : "start"}
              title={isPaused ? "resume" : "start (enter)"}
            >
              <Play className="fill-current" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="border-border"
            onClick={handleStop}
            disabled={state.status === "idle"}
            aria-label="reset"
            title="reset"
          >
            <RotateCcw />
          </Button>
        </div>

        {!isInputLocked && !justFinished && (
          <div className="flex items-center justify-center gap-0">
            {TIMER_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="ghost"
                size="xs"
                className="border-border text-muted-foreground"
                onClick={() => setDuration(preset.ms)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {justFinished && (
          <span
            role="status"
            className="font-black text-primary text-sm uppercase leading-none tracking-[0.25em]"
          >
            time&apos;s up
          </span>
        )}
      </div>
    </div>
  );
}
