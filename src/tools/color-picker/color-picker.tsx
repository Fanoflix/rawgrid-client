import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { useColorPicker } from "@/tools/color-picker/lib/use-color-picker";

export function ColorPickerTool() {
  const { color, output, handleColorChange } = useColorPicker();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <Input
        type="color"
        value={color}
        onChange={handleColorChange}
        className="h-32 w-full cursor-pointer border-y-border p-0"
        aria-label="color picker"
      />
      <div className="flex flex-1 flex-col gap-0">
        <div className="relative group">
          <Input
            value={output.hex}
            readOnly
            className="font-mono border-b-secondary"
          />
          <CopyButton
            value={output.hex}
            ariaLabel="copy hex"
            className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
        <div className="relative group">
          <Input
            value={output.rgb}
            readOnly
            className="font-mono border-b-secondary"
          />
          <CopyButton
            value={output.rgb}
            ariaLabel="copy rgb"
            className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
        <div className="relative group">
          <Input
            value={output.hsl}
            readOnly
            className="font-mono border-b-secondary"
          />
          <CopyButton
            value={output.hsl}
            ariaLabel="copy hsl"
            className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </div>
    </div>
  );
}
