import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
      <div className="flex w-full gap-0 border-b border-border">
        <Input
          value={state.input}
          onChange={handleInputChange}
          placeholder="unix timestamp"
          className="rounded-none border-0 border-r border-border font-mono"
        />
        <Select
          value={state.format}
          onValueChange={(value) => handleFormatChange(value ?? "date-string")}
        >
          <SelectTrigger className="rounded-none border-0">
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
        <div className="border-b border-border font-mono">
          gmt: {output.gmt}
        </div>
        <div className="font-mono">your time zone: {output.local}</div>
      </div>
    </div>
  );
}
