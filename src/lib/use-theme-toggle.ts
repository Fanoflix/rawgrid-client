import { useEffect, useState } from "react"

function getInitialTheme() {
  if (typeof window === "undefined") return false
  const stored = window.localStorage.getItem("theme")
  if (stored) return stored === "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function useThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialTheme)

  useEffect(() => {
    if (typeof document === "undefined") return
    document.documentElement.classList.toggle("dark", isDark)
    window.localStorage.setItem("theme", isDark ? "dark" : "light")
  }, [isDark])

  function toggleTheme() {
    setIsDark((previous) => !previous)
  }

  return { isDark, toggleTheme }
}
