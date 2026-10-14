import {
  deleteAppState,
  readAppState,
  readAppStateWithLocalStorageFallback,
  subscribeAppState,
  writeAppState,
} from "@/lib/storage";

export type TimerRun =
  | { status: "running"; endTime: number; totalMs: number }
  | { status: "paused"; remainingMs: number; totalMs: number }
  | { status: "finished"; endTime: number };

export const TIMER_RUN_KEY = "timer:run";
const ALARM_CLAIM_KEY = "timer:alarm-claimed-for";
const LEGACY_RUN_STORAGE_KEY = "timer-run";

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseTimerRun(raw: unknown): TimerRun | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<Record<string, unknown>>;
  if (
    candidate.status === "running" &&
    isNumber(candidate.endTime) &&
    isNumber(candidate.totalMs)
  ) {
    return {
      status: "running",
      endTime: candidate.endTime,
      totalMs: candidate.totalMs,
    };
  }
  if (
    candidate.status === "paused" &&
    isNumber(candidate.remainingMs) &&
    isNumber(candidate.totalMs)
  ) {
    return {
      status: "paused",
      remainingMs: candidate.remainingMs,
      totalMs: candidate.totalMs,
    };
  }
  if (candidate.status === "finished" && isNumber(candidate.endTime)) {
    return { status: "finished", endTime: candidate.endTime };
  }
  return null;
}

function parseLegacyTimerRun(raw: string): TimerRun | undefined {
  try {
    return parseTimerRun(JSON.parse(raw)) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function readTimerRun(): Promise<TimerRun | null> {
  try {
    const stored = await readAppStateWithLocalStorageFallback<TimerRun>(
      TIMER_RUN_KEY,
      LEGACY_RUN_STORAGE_KEY,
      parseLegacyTimerRun
    );
    return parseTimerRun(stored);
  } catch {
    return null;
  }
}

export async function writeTimerRun(run: TimerRun | null) {
  try {
    if (run) await writeAppState(TIMER_RUN_KEY, run);
    else await deleteAppState(TIMER_RUN_KEY);
  } catch {
    return;
  }
}

export function subscribeTimerRun(listener: (run: TimerRun | null) => void) {
  return subscribeAppState(TIMER_RUN_KEY, () => {
    readTimerRun().then(listener);
  });
}

export async function claimAlarm(endTime: number): Promise<boolean> {
  const canThisTabPlaySound = navigator.userActivation?.hasBeenActive ?? true;
  if (!canThisTabPlaySound) return false;

  async function claim() {
    try {
      const claimedFor = await readAppState<number>(ALARM_CLAIM_KEY);
      if (claimedFor === endTime) return false;
      await writeAppState(ALARM_CLAIM_KEY, endTime);
      return true;
    } catch {
      return true;
    }
  }

  if (!navigator.locks) return claim();
  return navigator.locks.request("timer-alarm-claim", claim);
}
