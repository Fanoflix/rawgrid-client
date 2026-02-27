import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useUnixTimestamp } from "@/tools/unix-timestamp/lib/use-unix-timestamp";

export function useUnixTimestampWithCommands() {
  const unixTimestamp = useUnixTimestamp();

  useEffect(() => {
    return subscribe("timestamp:set", (payload) => {
      if (payload) unixTimestamp.setTimestampInput(payload);
    });
  });

  return unixTimestamp;
}
