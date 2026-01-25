import { ThemeToggle } from "@/components/theme-toggle";

export function TopNavbar() {
  return (
    <div className="h-9 flex items-center justify-end w-screen border-b border-border bg-background px-1.5 gap-1">
      <p className="flex items-center flex-nowrap text-nowrap gap-0.5 text-tiny text-muted-foreground">
        Made by{" "}
        <a
          href="https://ammarnasir.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4 font-medium text-primary"
        >
          ammarnasir.com
        </a>
      </p>

      <ThemeToggle />
    </div>
  );
}
