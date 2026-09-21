import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

import { SwipeNavigateContext } from "@/lib/use-swipe-navigate";

const SWIPE_HALF_DURATION_MS = 200;
const FULLY_BLACK_HOLD_MS = 240;
const BRAND_FADE_IN_MS = 50;
const BRAND_OPACITY = 0.75;
const LANDING_PATH = "/";
const TOOLS_PATH = "/tools";
const ROUTER_BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "");

type SwipeDirection = "towards-tools" | "towards-landing";

const SWIPE_KEYFRAMES: Record<
  SwipeDirection,
  { cover: Keyframe[]; reveal: Keyframe[] }
> = {
  "towards-tools": {
    cover: [{ transform: "translateX(100%)" }, { transform: "translateX(0)" }],
    reveal: [
      { transform: "translateX(0)" },
      { transform: "translateX(-100%)" },
    ],
  },
  "towards-landing": {
    cover: [{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }],
    reveal: [{ transform: "translateX(0)" }, { transform: "translateX(100%)" }],
  },
};

class DeferredPopStateEvent extends PopStateEvent {
  constructor(state: unknown) {
    super("popstate", { state });
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getSwipeDirection(
  fromPath: string,
  toPath: string,
): SwipeDirection | null {
  if (fromPath === LANDING_PATH && toPath === TOOLS_PATH) {
    return "towards-tools";
  }
  if (fromPath === TOOLS_PATH && toPath === LANDING_PATH) {
    return "towards-landing";
  }
  return null;
}

function getRouterPathFromWindow() {
  const pathname = window.location.pathname;
  const routerPath = pathname.startsWith(ROUTER_BASENAME)
    ? pathname.slice(ROUTER_BASENAME.length)
    : pathname;
  return routerPath.replace(/\/$/, "") || LANDING_PATH;
}

export function PageSwipeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const isSwipingRef = useRef(false);
  const currentPathRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

  useLayoutEffect(() => {
    currentPathRef.current = location.pathname;
    navigateRef.current = navigate;
  }, [location.pathname, navigate]);

  const runSwipe = useCallback(
    async (direction: SwipeDirection, swapPage: () => void) => {
      const overlay = overlayRef.current;
      const brand = brandRef.current;
      if (!overlay || !brand) {
        swapPage();
        return;
      }
      isSwipingRef.current = true;
      const keyframes = SWIPE_KEYFRAMES[direction];

      overlay.style.visibility = "visible";
      await overlay.animate(keyframes.cover, {
        duration: SWIPE_HALF_DURATION_MS,
        easing: "ease-in",
        fill: "forwards",
      }).finished;

      brand.style.visibility = "visible";
      brand.animate([{ opacity: 0 }, { opacity: BRAND_OPACITY }], {
        duration: BRAND_FADE_IN_MS,
        easing: "ease-out",
        fill: "forwards",
      });
      flushSync(swapPage);
      await new Promise((resolve) =>
        window.setTimeout(resolve, FULLY_BLACK_HOLD_MS),
      );
      brand.style.visibility = "hidden";

      await overlay.animate(keyframes.reveal, {
        duration: SWIPE_HALF_DURATION_MS,
        easing: "ease-in",
        fill: "forwards",
      }).finished;

      overlay.style.visibility = "hidden";
      isSwipingRef.current = false;
    },
    [],
  );

  const swipeNavigate = useCallback(
    (path: string) => {
      const direction = getSwipeDirection(currentPathRef.current, path);
      if (!direction || prefersReducedMotion()) {
        navigateRef.current(path);
        return;
      }
      if (isSwipingRef.current) return;
      void runSwipe(direction, () => navigateRef.current(path));
    },
    [runSwipe],
  );

  useLayoutEffect(() => {
    function swipeOnBrowserBackOrForward(event: PopStateEvent) {
      if (event instanceof DeferredPopStateEvent) return;
      const arrivingPath = getRouterPathFromWindow();
      const direction = getSwipeDirection(currentPathRef.current, arrivingPath);
      if (!direction || isSwipingRef.current || prefersReducedMotion()) return;

      event.stopImmediatePropagation();
      void runSwipe(direction, () =>
        window.dispatchEvent(new DeferredPopStateEvent(event.state)),
      );
    }

    window.addEventListener("popstate", swipeOnBrowserBackOrForward);
    return () =>
      window.removeEventListener("popstate", swipeOnBrowserBackOrForward);
  }, [runSwipe]);

  return (
    <SwipeNavigateContext.Provider value={swipeNavigate}>
      {children}
      <div
        ref={overlayRef}
        aria-hidden
        className="invisible fixed inset-0 z-[100] bg-white dark:bg-black"
      />
      <div
        ref={brandRef}
        aria-hidden
        className="pointer-events-none invisible fixed inset-0 z-[101] flex flex-col items-center justify-center gap-3 text-black dark:text-white"
      >
        <span aria-hidden className="rawgrid-logo size-16" />
        <span className="text-lg font-medium tracking-tight">rawgrid</span>
      </div>
    </SwipeNavigateContext.Provider>
  );
}
