import { cn } from "@/lib/utils";

export interface KbdProps {
  keys: readonly string[];
  className?: string;
}

export function Kbd({ keys, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-4 shrink-0 items-center gap-0.5 rounded-none bg-secondary px-1 font-sans text-10 leading-none tracking-wide text-secondary-foreground",
        className
      )}
    >
      {keys.map((key) => (
        <span key={key}>{key}</span>
      ))}
    </kbd>
  );
}
