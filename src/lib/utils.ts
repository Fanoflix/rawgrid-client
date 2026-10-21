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

export const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)

export const MOD_KEY_LABEL = IS_MAC ? "⌘" : "ctrl"

export function hasModKey(event: KeyboardEvent) {
  return IS_MAC ? event.metaKey : event.ctrlKey
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
