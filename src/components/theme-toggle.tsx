import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/lib/use-theme-toggle";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeToggle();

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="border border-border cursor-pointer bg-background px-2.5 py-0"
      onClick={toggleTheme}
      aria-label="toggle theme"
    >
      {isDark ? "dark" : "light"}
    </Button>
  );
}
