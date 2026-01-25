import { ThemeToggle } from "@/components/theme-toggle";

export function TopNavbar() {
  return (
    <div className="h-8 w-screen border-b border-border bg-background">
      <div className="flex h-full w-full items-center justify-end">
        <ThemeToggle />
      </div>
    </div>
  );
}
