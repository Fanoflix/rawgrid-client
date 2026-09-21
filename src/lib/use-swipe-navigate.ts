import { createContext, useContext } from "react";

export const SwipeNavigateContext = createContext<(path: string) => void>(
  () => {}
);

export function useSwipeNavigate() {
  return useContext(SwipeNavigateContext);
}
