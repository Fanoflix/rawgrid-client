import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUnixTimestamp } from "@/tools/unix-timestamp/lib/use-unix-timestamp";

export function UnixTimestampTool() {
  const {
    state,
    output,
    formatOptions,
    handleInputChange,
    handleFormatChange,
  } = useUnixTimestamp();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex w-full gap-0">
        <Input
          value={state.input}
          onChange={handleInputChange}
          placeholder="unix timestamp"
          className="rounded-none font-mono border-y-border"
        />
        <Select
          value={state.format}
          onValueChange={(value) => handleFormatChange(value ?? "date-string")}
        >
          <SelectTrigger className="rounded-none border border-border bg-background">
            <SelectValue placeholder="format" />
          </SelectTrigger>
          <SelectContent>
            {formatOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-1 flex-col gap-0">
        <TimestampOutputRow
          label="gmt"
          value={output.gmt}
          className="border-b border-border"
        />
        <TimestampOutputRow label="your time zone" value={output.local} />
      </div>
    </div>
  );
}

interface TimestampOutputRowProps {
  label: string;
  value: string;
  className?: string;
}

function TimestampOutputRow({
  label,
  value,
  className,
}: TimestampOutputRowProps) {
  return (
    <div
      className={cn(
        "group relative font-mono px-1 py-1.5 text-xs h-8",
        className
      )}
    >
      <span className="text-muted-foreground bg-accent/50 p-1">{label}:</span>{" "}
      {value}
      <div className="font-sans absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={value} ariaLabel={`copy ${label}`} />
      </div>
    </div>
  );
}
