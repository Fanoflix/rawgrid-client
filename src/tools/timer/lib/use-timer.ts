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
  claimAlarm,
  parseTimerRun,
  readTimerRun,
  TIMER_RUN_STORAGE_KEY,
  writeTimerRun,
  type TimerRun,
} from "@/tools/timer/lib/timer-run-storage";
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

interface RestoredTimer {
  status: TimerStatus;
  remainingMs: number;
  totalMs: number;
  endTime: number | null;
  justFinished: boolean;
}

function restoreTimer(run: TimerRun | null, now: number): RestoredTimer {
  if (run?.status === "running" && run.endTime > now) {
    return {
      status: "running",
      remainingMs: run.endTime - now,
      totalMs: run.totalMs,
      endTime: run.endTime,
      justFinished: false,
    };
  }
  if (run?.status === "paused") {
    return {
      status: "paused",
      remainingMs: run.remainingMs,
      totalMs: run.totalMs,
      endTime: null,
      justFinished: false,
    };
  }
  const finishedAt = run ? ("endTime" in run ? run.endTime : null) : null;
  return {
    status: "idle",
    remainingMs: 0,
    totalMs: 0,
    endTime: null,
    justFinished:
      finishedAt !== null && now - finishedAt < TIMER_CONFIG.finishFlashMs,
  };
}

export function useTimer() {
  const { value: input, setValue: setInput } = useToolHistory<TimerInput>({
    tool: "timer",
    initialValue: TIMER_CONFIG.defaultInput,
    serialize: serializeInput,
    deserialize: deserializeInput,
  });

  const [initialTimer] = useState(() =>
    restoreTimer(readTimerRun(), Date.now())
  );
  const [remainingMs, setRemainingMs] = useState(initialTimer.remainingMs);
  const [totalMs, setTotalMs] = useState(initialTimer.totalMs);
  const [status, setStatus] = useState<TimerStatus>(initialTimer.status);
  const [justFinished, setJustFinished] = useState(initialTimer.justFinished);
  const [soundId, setSoundIdState] = useState(getInitialSound);
  // Read through a ref so a sound change mid-run doesn't rebuild the interval.
  const soundIdRef = useRef(soundId);
  const endTimeRef = useRef<number | null>(initialTimer.endTime);
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
    const endTime = endTimeRef.current;
    clearIntervalRef();
    endTimeRef.current = null;
    setRemainingMs(0);
    setTotalMs(0);
    setStatus("idle");
    setJustFinished(true);
    if (endTime === null) return;
    writeTimerRun({ status: "finished", endTime });
    void claimAlarm(endTime).then((isClaimedByThisTab) => {
      if (isClaimedByThisTab) playTimerSound(soundIdRef.current);
    });
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

  const applyRestoredTimer = useCallback(
    (restored: RestoredTimer) => {
      endTimeRef.current = restored.endTime;
      setRemainingMs(restored.remainingMs);
      setTotalMs(restored.totalMs);
      setStatus(restored.status);
      setJustFinished(restored.justFinished);
      if (restored.endTime === null) clearIntervalRef();
      else startInterval();
    },
    [clearIntervalRef, startInterval]
  );

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

    const endTime = Date.now() + nextDuration;
    const nextTotalMs = status === "paused" ? totalMs : nextDuration;
    endTimeRef.current = endTime;
    setRemainingMs(nextDuration);
    setTotalMs(nextTotalMs);
    setStatus("running");
    writeTimerRun({ status: "running", endTime, totalMs: nextTotalMs });
    setJustFinished(false);
    startInterval();
  }, [input, remainingMs, startInterval, status, totalMs]);

  const handlePause = useCallback(() => {
    if (status !== "running" || endTimeRef.current === null) return;
    const pausedRemainingMs = Math.max(0, endTimeRef.current - Date.now());
    clearIntervalRef();
    endTimeRef.current = null;
    setRemainingMs(pausedRemainingMs);
    setStatus("paused");
    writeTimerRun({ status: "paused", remainingMs: pausedRemainingMs, totalMs });
  }, [clearIntervalRef, status, totalMs]);

  const handleStop = useCallback(() => {
    clearIntervalRef();
    endTimeRef.current = null;
    setRemainingMs(0);
    setTotalMs(0);
    setStatus("idle");
    setJustFinished(false);
    writeTimerRun(null);
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
    if (endTimeRef.current !== null) startInterval();
    return () => clearIntervalRef();
  }, [clearIntervalRef, startInterval]);

  useEffect(() => {
    function handleTimerRunChangedInAnotherTab(event: StorageEvent) {
      if (event.key !== TIMER_RUN_STORAGE_KEY) return;
      applyRestoredTimer(restoreTimer(parseTimerRun(event.newValue), Date.now()));
    }
    window.addEventListener("storage", handleTimerRunChangedInAnotherTab);
    return () =>
      window.removeEventListener("storage", handleTimerRunChangedInAnotherTab);
  }, [applyRestoredTimer]);

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
