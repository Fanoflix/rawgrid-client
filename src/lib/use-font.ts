import { useState } from "react"

export interface UseFontOptions {
  minSize: number
  maxSize: number
  defaultSize: number
}

export function useFont({ minSize, maxSize, defaultSize }: UseFontOptions) {
  const [fontSize, setFontSize] = useState(defaultSize)

  function increaseFont() {
    setFontSize((size) => Math.min(size + 1, maxSize))
  }

  function decreaseFont() {
    setFontSize((size) => Math.max(size - 1, minSize))
  }

  return {
    fontSize,
    increaseFont,
    decreaseFont,
  }
}
