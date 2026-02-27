import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useTimer } from "@/tools/timer/lib/use-timer";

export function useTimerWithCommands() {
  const timer = useTimer();

  useEffect(() => {
    const unsubs = [
      subscribe("timer:play", () => timer.handlePlay()),
      subscribe("timer:pause", () => timer.handlePause()),
      subscribe("timer:stop", () => timer.handleStop()),
      subscribe("timer:set", (payload) => {
        if (payload) timer.setTime(payload);
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  });

  return timer;
}
