export type TimerRun =
  | { status: "running"; endTime: number; totalMs: number }
  | { status: "paused"; remainingMs: number; totalMs: number }
  | { status: "finished"; endTime: number };

export const TIMER_RUN_STORAGE_KEY = "timer-run";
const ALARM_CLAIM_STORAGE_KEY = "timer-alarm-claimed-for";

export function readTimerRun(): TimerRun | null {
  try {
    return parseTimerRun(window.localStorage.getItem(TIMER_RUN_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function parseTimerRun(raw: string | null): TimerRun | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    const isNumber = (value: unknown): value is number =>
      typeof value === "number" && Number.isFinite(value);

    if (parsed.status === "running" && isNumber(parsed.endTime) && isNumber(parsed.totalMs)) {
      return { status: "running", endTime: parsed.endTime, totalMs: parsed.totalMs };
    }
    if (parsed.status === "paused" && isNumber(parsed.remainingMs) && isNumber(parsed.totalMs)) {
      return { status: "paused", remainingMs: parsed.remainingMs, totalMs: parsed.totalMs };
    }
    if (parsed.status === "finished" && isNumber(parsed.endTime)) {
      return { status: "finished", endTime: parsed.endTime };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeTimerRun(run: TimerRun | null) {
  try {
    if (run) window.localStorage.setItem(TIMER_RUN_STORAGE_KEY, JSON.stringify(run));
    else window.localStorage.removeItem(TIMER_RUN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function claimAlarm(endTime: number): Promise<boolean> {
  const canThisTabPlaySound = navigator.userActivation?.hasBeenActive ?? true;
  if (!canThisTabPlaySound) return false;

  const claim = () => {
    try {
      if (window.localStorage.getItem(ALARM_CLAIM_STORAGE_KEY) === String(endTime)) {
        return false;
      }
      window.localStorage.setItem(ALARM_CLAIM_STORAGE_KEY, String(endTime));
      return true;
    } catch {
      return true;
    }
  };

  if (!navigator.locks) return claim();
  return navigator.locks.request("timer-alarm-claim", claim);
}
