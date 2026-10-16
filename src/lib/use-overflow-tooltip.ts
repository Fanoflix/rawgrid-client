import { useEffect, useState } from "react";

const AREA_SELECTOR = "[data-overflow-tooltip]";

export interface OverflowTooltipTarget {
  element: HTMLElement;
  text: string;
  rect: DOMRect;
}

function isCutOff(element: HTMLElement) {
  return (
    Boolean(element.textContent?.trim()) &&
    element.scrollWidth > element.clientWidth &&
    getComputedStyle(element).textOverflow === "ellipsis"
  );
}

function findCutOffElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const area = target.closest(AREA_SELECTOR);
  if (!area) return null;
  for (
    let element: Element | null = target;
    element && element !== area;
    element = element.parentElement
  ) {
    if (element instanceof HTMLElement && isCutOff(element)) return element;
  }
  return null;
}

export function useOverflowTooltip() {
  const [target, setTarget] = useState<OverflowTooltipTarget | null>(null);

  useEffect(() => {
    function showFor(eventTarget: EventTarget | null) {
      const element = findCutOffElement(eventTarget);
      setTarget((current) => {
        if (!element) return null;
        if (current?.element === element) return current;
        return {
          element,
          text: element.textContent ?? "",
          rect: element.getBoundingClientRect(),
        };
      });
    }

    function handlePointerOver(event: PointerEvent) {
      showFor(event.target);
    }

    function handlePointerOut(event: PointerEvent) {
      if (event.relatedTarget === null) setTarget(null);
    }

    function hide() {
      setTarget(null);
    }

    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);
    document.addEventListener("pointerdown", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      document.removeEventListener("pointerdown", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return target;
}
