import type { ChangeEvent, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import { TIMER_CONFIG, type TimerInput } from "@/tools/timer/lib/constants";
import {
  DEFAULT_TIMER_SOUND,
  isTimerSoundId,
  type TimerSoundId,
} from "@/tools/timer/lib/sounds";
import {
  formatDurationParts,
  parseDurationParts,
  parseLegacyDurationString,
  playTimerSound,
} from "@/tools/timer/lib/utils";

export type TimerStatus = "idle" | "running" | "paused";

export interface TimerState {
  input: TimerInput;
  remainingMs: number;
  totalMs: number;
  status: TimerStatus;
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

const SOUND_STORAGE_KEY = "timer-sound";

function getInitialSound(): TimerSoundId {
  try {
    const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return isTimerSoundId(stored) ? stored : DEFAULT_TIMER_SOUND;
  } catch {
    return DEFAULT_TIMER_SOUND;
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
  const [totalMs, setTotalMs] = useState(0);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [justFinished, setJustFinished] = useState(false);
  const [soundId, setSoundIdState] = useState(getInitialSound);
  // Read through a ref so a sound change mid-run doesn't rebuild the interval.
  const soundIdRef = useRef(soundId);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Reaching zero returns the timer to its idle state so the entered duration is
  // sitting there ready to run again; the flash is what signals that it fired.
  const finish = useCallback(() => {
    clearIntervalRef();
    endTimeRef.current = null;
    setRemainingMs(0);
    setTotalMs(0);
    setStatus("idle");
    setJustFinished(true);
    playTimerSound(soundIdRef.current);
  }, [clearIntervalRef]);

  const tick = useCallback(() => {
    if (!endTimeRef.current) return;
    const remaining = Math.max(0, endTimeRef.current - Date.now());
    if (remaining === 0) {
      finish();
      return;
    }
    setRemainingMs(remaining);
  }, [finish]);

  const startInterval = useCallback(() => {
    clearIntervalRef();
    intervalRef.current = window.setInterval(tick, TIMER_CONFIG.tickMs);
  }, [clearIntervalRef, tick]);

  function handleInputChange(part: keyof TimerInput) {
    return function onChange(event: ChangeEvent<HTMLInputElement>) {
      const nextValue =
        part === "hours"
          ? sanitizeHoursPart(event.target.value)
          : sanitizeTwoDigitPart(event.target.value);
      setJustFinished(false);
      setInput((current) => ({ ...current, [part]: nextValue }));
    };
  }

  // Blur normalizes the whole duration so typing "90" into minutes settles as
  // 01:30:00 rather than an impossible-looking 00:90:00.
  function handleInputBlur() {
    setInput((current) => formatDurationParts(parseDurationParts(current)));
  }

  const handlePlay = useCallback(() => {
    if (status === "running") return;

    const nextDuration =
      status === "paused" ? remainingMs : parseDurationParts(input);
    if (!nextDuration) return;

    endTimeRef.current = Date.now() + nextDuration;
    setRemainingMs(nextDuration);
    if (status !== "paused") setTotalMs(nextDuration);
    setStatus("running");
    setJustFinished(false);
    startInterval();
  }, [input, remainingMs, startInterval, status]);

  const handlePause = useCallback(() => {
    if (status !== "running") return;
    tick();
    clearIntervalRef();
    setStatus("paused");
  }, [clearIntervalRef, status, tick]);

  const handleStop = useCallback(() => {
    clearIntervalRef();
    endTimeRef.current = null;
    setRemainingMs(0);
    setTotalMs(0);
    setStatus("idle");
    setJustFinished(false);
  }, [clearIntervalRef]);

  const handleToggle = useCallback(() => {
    if (status === "running") handlePause();
    else handlePlay();
  }, [handlePause, handlePlay, status]);

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      handlePlay();
      return;
    }

    // Arrow keys nudge the focused part, the way a native stepper would.
    const direction = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    const part = event.currentTarget.dataset.part as keyof TimerInput;
    const step = part === "hours" ? 3600 : part === "minutes" ? 60 : 1;
    const next = parseDurationParts(input) + direction * step * 1000;
    setJustFinished(false);
    setInput(formatDurationParts(Math.max(0, next)));
  }

  useEffect(() => {
    return () => clearIntervalRef();
  }, [clearIntervalRef]);

  useEffect(() => {
    if (!justFinished) return;
    const handle = window.setTimeout(
      () => setJustFinished(false),
      TIMER_CONFIG.finishFlashMs
    );
    return () => window.clearTimeout(handle);
  }, [justFinished]);

  const setTime = useCallback(
    (timeString: string) => {
      const parts = timeString.split(":");
      if (parts.length !== 3) return;
      const [hours, minutes, seconds] = parts;
      setJustFinished(false);
      setInput({
        hours: padTwoDigitPart(sanitizeHoursPart(hours)),
        minutes: padTwoDigitPart(sanitizeTwoDigitPart(minutes)),
        seconds: padTwoDigitPart(sanitizeTwoDigitPart(seconds)),
      });
    },
    [setInput]
  );

  // Picking a sound plays it once so it can be auditioned.
  const setSoundId = useCallback((next: TimerSoundId) => {
    soundIdRef.current = next;
    setSoundIdState(next);
    playTimerSound(next);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const dismissFinished = useCallback(() => setJustFinished(false), []);

  const setDuration = useCallback(
    (ms: number) => {
      setJustFinished(false);
      setInput(formatDurationParts(ms));
    },
    [setInput]
  );

  const displayParts = useMemo(() => {
    if (status === "idle") return input;
    return formatDurationParts(remainingMs);
  }, [input, remainingMs, status]);

  const inputMs = useMemo(() => parseDurationParts(input), [input]);

  const state: TimerState = { input, remainingMs, totalMs, status };

  return {
    state,
    displayParts,
    justFinished,
    isInputLocked: status !== "idle",
    /** Share of the run still left, 0-100. Full while idle so the bar reads as "armed". */
    percentRemaining:
      status === "idle" || !totalMs ? 100 : (remainingMs / totalMs) * 100,
    isUrgent: status === "running" && remainingMs <= TIMER_CONFIG.urgentBelowMs,
    canStart: status === "paused" ? remainingMs > 0 : inputMs > 0,
    handleInputChange,
    handleInputBlur,
    handleInputKeyDown,
    handlePlay,
    handlePause,
    handleStop,
    handleToggle,
    dismissFinished,
    setTime,
    setDuration,
    soundId,
    setSoundId,
  };
}
