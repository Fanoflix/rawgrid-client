import { Input } from "@/components/ui/input";
import { useQuickRemember } from "@/tools/quick-remember/lib/use-quick-remember";

export function QuickRememberTool() {
  const { entries, getEntryChangeHandler } = useQuickRemember();

  return (
    <div className="flex w-full gap-0 p-0 h-8">
      {entries.map((value, index) => (
        <Input
          key={`quick-remember-${index}`}
          placeholder="quick things to remember"
          value={value ?? ""}
          onChange={getEntryChangeHandler(index)}
          className="h-8 w-full rounded-none border-l-border"
        />
      ))}
    </div>
  );
}
