import { CopyButton } from "@/components/copy-button"
import { Input } from "@/components/ui/input"
import { useColorPicker } from "@/tools/color-picker/lib/use-color-picker"

export function ColorPickerTool() {
  const { color, output, handleColorChange } = useColorPicker()

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <input
        type="color"
        value={color}
        onChange={handleColorChange}
        className="h-24 w-full cursor-pointer border-0 border-b border-border p-0 rounded-none"
        aria-label="color picker"
      />
      <div className="flex flex-1 flex-col gap-0">
        <div className="relative group">
          <Input
            value={output.hex}
            readOnly
            className="rounded-none border-0 border-b border-border font-mono"
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
            className="rounded-none border-0 border-b border-border font-mono"
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
            className="rounded-none border-0 font-mono"
          />
          <CopyButton
            value={output.hsl}
            ariaLabel="copy hsl"
            className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </div>
    </div>
  )
}
