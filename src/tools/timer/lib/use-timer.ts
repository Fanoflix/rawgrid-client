import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { TIMER_CONFIG, type TimerInput } from "@/tools/timer/lib/constants";
import {
  formatDurationParts,
  parseDurationParts,
  parseLegacyDurationString,
  playTimerSound,
} from "@/tools/timer/lib/utils";

export interface TimerState {
  input: TimerInput;
  remainingMs: number;
  status: "idle" | "running" | "paused" | "completed";
}

function sanitizeHoursPart(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function sanitizeTwoDigitPart(value: string) {
  return value.replace(/\D/g, "").slice(0, 2);
}

function padTwoDigitPart(value: string) {
  if (!value) return "00";
  return value.padStart(2, "0");
}

function normalizeInput(value?: Partial<TimerInput> | null): TimerInput {
  return {
    hours: padTwoDigitPart(sanitizeHoursPart(value?.hours ?? "")),
    minutes: padTwoDigitPart(sanitizeTwoDigitPart(value?.minutes ?? "")),
    seconds: padTwoDigitPart(sanitizeTwoDigitPart(value?.seconds ?? "")),
  };
}

function serializeInput(value: TimerInput) {
  return JSON.stringify(value);
}

function deserializeInput(value: string) {
  try {
    const parsed = JSON.parse(value) as Partial<TimerInput>;
    return normalizeInput(parsed);
  } catch {
    const legacyMs = parseLegacyDurationString(value);
    if (legacyMs === null) return TIMER_CONFIG.defaultInput;
    return formatDurationParts(legacyMs);
  }
}

export function useTimer() {
  const { value: input, setValue: setInput } = useToolHistory<TimerInput>({
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

  function handleInputChange(part: keyof TimerInput) {
    return function onChange(event: ChangeEvent<HTMLInputElement>) {
      const nextValue =
        part === "hours"
          ? sanitizeHoursPart(event.target.value)
          : sanitizeTwoDigitPart(event.target.value);
      setInput((current) => ({ ...current, [part]: nextValue }));
    };
  }

  function handleInputBlur(part: keyof TimerInput) {
    return function onBlur() {
      setInput((current) => ({
        ...current,
        [part]: padTwoDigitPart(current[part]),
      }));
    };
  }

  function handlePlay() {
    if (status === "running") return;

    const nextDuration =
      status === "paused" ? remainingMs : parseDurationParts(input);
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

  const displayParts = useMemo(() => {
    if (status === "idle") return input;
    return formatDurationParts(remainingMs);
  }, [input, remainingMs, status]);

  const state: TimerState = {
    input,
    remainingMs,
    status,
  };

  return {
    state,
    displayParts,
    isInputLocked: status !== "idle",
    handleInputChange,
    handleInputBlur,
    handlePlay,
    handlePause,
    handleStop,
  };
}
