import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useJwtDecoder } from "@/tools/jwt-decoder/lib/use-jwt-decoder";

export function useJwtDecoderWithCommands() {
  const jwtDecoder = useJwtDecoder();

  useEffect(() => {
    return subscribe("jwt:set", (payload) => {
      if (payload) jwtDecoder.setToken(payload);
    });
  });

  return jwtDecoder;
}
