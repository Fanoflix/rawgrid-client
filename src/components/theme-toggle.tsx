import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/lib/use-theme-toggle";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeToggle();

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={toggleTheme}
      aria-label="toggle theme"
    >
      {isDark ? "dark" : "light"}
    </Button>
  );
}
