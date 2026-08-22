export interface TimerInput {
  hours: string;
  minutes: string;
  seconds: string;
}

export interface TimerConfig {
  defaultInput: TimerInput;
  tickMs: number;
  /** How long the "time's up" flash sticks around after the timer resets itself. */
  finishFlashMs: number;
  /** Remaining time below which the countdown starts pulsing. */
  urgentBelowMs: number;
}

export const TIMER_CONFIG: TimerConfig = {
  defaultInput: { hours: "00", minutes: "05", seconds: "00" },
  tickMs: 200,
  finishFlashMs: 6000,
  urgentBelowMs: 10_000,
};

export const TIMER_PRESETS = [
  { label: "1m", ms: 60_000 },
  { label: "5m", ms: 5 * 60_000 },
  { label: "10m", ms: 10 * 60_000 },
  { label: "25m", ms: 25 * 60_000 },
] as const;
