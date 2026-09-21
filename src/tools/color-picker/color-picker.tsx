import { useEffect, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Input } from "@/components/ui/input";
import { useColorPickerWithCommands as useColorPicker } from "@/tools/color-picker/lib/use-color-picker-commands";
import type { ColorPickerOutput } from "@/tools/color-picker/lib/use-color-picker";
import {
  parseHexInput,
  parseHslInput,
  parseHwbInput,
  parseOklabInput,
  parseOklchInput,
  parseRgbInput,
} from "@/tools/color-picker/lib/utils";

const EDIT_DEBOUNCE_MS = 200;

const COLOR_FIELDS: {
  format: keyof ColorPickerOutput;
  parse: (text: string) => string | null;
}[] = [
  { format: "hex", parse: parseHexInput },
  { format: "rgb", parse: parseRgbInput },
  { format: "hsl", parse: parseHslInput },
  { format: "hwb", parse: parseHwbInput },
  { format: "oklch", parse: parseOklchInput },
  { format: "oklab", parse: parseOklabInput },
];

export function ColorPickerTool() {
  const { color, output, setColor, handleColorChange } = useColorPicker();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <Input
        type="color"
        value={color}
        onChange={handleColorChange}
        className="h-16 w-full shrink-0 cursor-pointer border-b-border p-0"
        aria-label="color picker"
      />
      <div className="flex flex-1 flex-col gap-0">
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.format}
            format={field.format}
            value={output[field.format]}
            parse={field.parse}
            onValidColor={setColor}
          />
        ))}
      </div>
    </div>
  );
}

interface ColorFieldProps {
  format: keyof ColorPickerOutput;
  /** The canonical value, derived from the current color. */
  value: string;
  /** Turns typed text into a #rrggbb color, or null if it isn't one yet. */
  parse: (text: string) => string | null;
  onValidColor: (hex: string) => void;
}

// While focused, the field shows exactly what was typed, so the other fields
// can update live without the one being edited reformatting under the cursor.
// It snaps back to the canonical format on blur.
function ColorField({ format, value, parse, onValidColor }: ColorFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const isInvalid = draft !== null && parse(draft) === null;

  useEffect(() => {
    if (draft === null) return;
    const debounceTimer = window.setTimeout(() => {
      const hex = parse(draft);
      if (hex) onValidColor(hex);
    }, EDIT_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceTimer);
  }, [draft, onValidColor, parse]);

  return (
    <div className="relative group">
      <Input
        value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          // Apply a valid edit right away instead of losing it to the debounce.
          const hex = draft === null ? null : parse(draft);
          if (hex) onValidColor(hex);
          setDraft(null);
        }}
        spellCheck={false}
        aria-label={format}
        aria-invalid={isInvalid || undefined}
        className="font-mono border-b-secondary"
      />
      <CopyButton
        value={value}
        ariaLabel={`copy ${format}`}
        className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}
