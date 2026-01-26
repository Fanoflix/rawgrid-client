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
          <SelectTrigger className="rounded-none border-l-border border-y-border bg-background">
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
        <TimestampOutputRow label="gmt tz" value={output.gmt} />
        <TimestampOutputRow label="local tz" value={output.local} />
        <PrettyDateOutputRow
          date={output.prettyDate}
          time={output.prettyTime}
          displayValue={output.prettyDisplay}
        />
      </div>
    </div>
  );
}

interface TimestampOutputRowProps {
  label: string;
  value: string;
  className?: string;
}

function PrettyDateOutputRow({
  date,
  time,
  displayValue,
}: {
  date: string;
  time: string;
  displayValue: string;
}) {
  const hasPretty = Boolean(date && time);
  return (
    <div className="group relative px-1 py-1.5 h-full w-full flex flex-col border-b border-border items-center justify-center text-center text-base">
      {hasPretty ? (
        <>
          <span className="font-sans font-bold">{date}</span>{" "}
          <span className="font-sans font-medium">{time}</span>
        </>
      ) : (
        displayValue
      )}
      <div className="font-sans absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={displayValue} ariaLabel={`copy pretty date`} />
      </div>
    </div>
  );
}

function TimestampOutputRow({
  label,
  value,
  className,
}: TimestampOutputRowProps) {
  return (
    <div
      className={cn(
        "group relative font-mono px-1 py-1.5 text-xs h-8 border-b border-border",
        className
      )}
    >
      <span className="text-muted-foreground bg-accent/50 p-1">{label}</span>{" "}
      {value}
      <div className="font-sans absolute right-1 top-1 flex gap-0 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={value} ariaLabel={`copy ${label}`} />
      </div>
    </div>
  );
}
