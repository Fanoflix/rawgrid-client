export interface TimerInput {
  hours: string;
  minutes: string;
  seconds: string;
}

export interface TimerConfig {
  defaultInput: TimerInput;
  tickMs: number;
}

export const TIMER_CONFIG: TimerConfig = {
  defaultInput: { hours: "00", minutes: "05", seconds: "00" },
  tickMs: 200,
};
