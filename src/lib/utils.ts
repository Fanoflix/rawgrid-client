import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["10", "11", "13"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ESCAPE_OWNING_TARGETS =
  "input, textarea, [contenteditable=true], [role=dialog], [role=alertdialog]"

export function isPageEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return false
  return !(
    event.target instanceof Element &&
    event.target.closest(ESCAPE_OWNING_TARGETS)
  )
}
