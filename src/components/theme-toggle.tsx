import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeToggle } from "@/lib/use-theme-toggle";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeToggle();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="border cursor-pointer bg-background p-0"
      onClick={toggleTheme}
      aria-label="toggle theme"
    >
      {isDark ? <Sun className="size-3" /> : <Moon className="size-3" />}
    </Button>
  );
}
