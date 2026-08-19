import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useBase64 } from "@/tools/base64/lib/use-base64";

export function useBase64WithCommands() {
  const base64 = useBase64();

  useEffect(() => {
    const unsubs = [
      subscribe("base64:encode", (payload) => {
        if (payload) base64.encodeFrom(payload);
      }),
      subscribe("base64:decode", (payload) => {
        if (payload) base64.decodeFrom(payload);
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  });

  return base64;
}
