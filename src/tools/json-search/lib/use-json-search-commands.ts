import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useJsonSearch } from "@/tools/json-search/lib/use-json-search";

export function useJsonSearchWithCommands() {
  const jsonSearch = useJsonSearch();

  useEffect(() => {
    return subscribe("json:set", (payload) => {
      if (payload) jsonSearch.loadJson(payload);
    });
  });

  return jsonSearch;
}
