import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { TIMER_CONFIG } from "@/tools/timer/lib/constants";
import {
  formatDuration,
  parseDurationInput,
  playTimerSound,
} from "@/tools/timer/lib/utils";

export interface TimerState {
  input: string;
  remainingMs: number;
  status: "idle" | "running" | "paused" | "completed";
}

function serializeInput(value: string) {
  return value;
}

function deserializeInput(value: string) {
  return value || TIMER_CONFIG.defaultInput;
}

export function useTimer() {
  const { value: input, setValue: setInput } = useToolHistory<string>({
    tool: "timer",
    initialValue: TIMER_CONFIG.defaultInput,
    serialize: serializeInput,
    deserialize: deserializeInput,
  });

  const [remainingMs, setRemainingMs] = useState(0);
  const [status, setStatus] = useState<TimerState["status"]>("idle");
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  function clearIntervalRef() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function tick() {
    if (!endTimeRef.current) return;
    const remaining = Math.max(0, endTimeRef.current - Date.now());
    setRemainingMs(remaining);
    if (remaining === 0) {
      clearIntervalRef();
      setStatus("completed");
      playTimerSound();
    }
  }

  function startInterval() {
    clearIntervalRef();
    intervalRef.current = window.setInterval(tick, TIMER_CONFIG.tickMs);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
  }

  function handlePlay() {
    if (status === "running") return;

    const nextDuration =
      status === "paused" ? remainingMs : parseDurationInput(input);
    if (!nextDuration) return;

    endTimeRef.current = Date.now() + nextDuration;
    setRemainingMs(nextDuration);
    setStatus("running");
    startInterval();
  }

  function handlePause() {
    if (status !== "running") return;
    tick();
    clearIntervalRef();
    setStatus("paused");
  }

  function handleStop() {
    clearIntervalRef();
    endTimeRef.current = null;
    setRemainingMs(0);
    setStatus("idle");
  }

  useEffect(() => {
    return () => clearIntervalRef();
  }, []);

  const displayValue = useMemo(() => {
    const baseMs = status === "idle" ? parseDurationInput(input) : remainingMs;
    return formatDuration(baseMs);
  }, [input, remainingMs, status]);

  const state: TimerState = {
    input,
    remainingMs,
    status,
  };

  return {
    state,
    displayValue,
    handleInputChange,
    handlePlay,
    handlePause,
    handleStop,
  };
}
