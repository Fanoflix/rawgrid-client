import { ThemeToggle } from "@/components/theme-toggle";

export function TopNavbar() {
  return (
    <div className="h-9 flex items-center justify-end w-screen bg-background px-1.5 gap-3">
      <p className="flex items-center flex-nowrap text-nowrap gap-0.5 text-xs">
        made by{" "}
        <a
          href="https://ammarnasir.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-thin text-primary"
        >
          ammarnasir.com
        </a>
      </p>

      <ThemeToggle />
    </div>
  );
}
