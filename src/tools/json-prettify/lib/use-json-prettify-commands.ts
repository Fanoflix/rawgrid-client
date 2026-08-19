import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useJsonPrettify } from "@/tools/json-prettify/lib/use-json-prettify";

export function useJsonPrettifyWithCommands() {
  const jsonPrettify = useJsonPrettify();

  useEffect(() => {
    const unsubs = [
      subscribe("json-prettify:set", (payload) => {
        if (payload) jsonPrettify.setInput(payload);
      }),
      subscribe("json-prettify:minify", () => jsonPrettify.setMode("minified")),
      subscribe("json-prettify:pretty", () => jsonPrettify.setMode("pretty")),
    ];
    return () => unsubs.forEach((fn) => fn());
  });

  return jsonPrettify;
}
