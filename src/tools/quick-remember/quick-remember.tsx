import { Input } from "@/components/ui/input";

export function QuickRememberTool() {
  return (
    <div className="flex w-full gap-0 p-0 h-8">
      <Input
        placeholder="quick things to remember"
        className="h-8 w-full rounded-none border-l-border"
      />
      <Input
        placeholder="quick things to remember"
        className="h-8 w-full rounded-none border-l-border"
      />
      <Input
        placeholder="quick things to remember"
        className="h-8 w-full rounded-none border-l-border"
      />
    </div>
  );
}
