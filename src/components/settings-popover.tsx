import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Braces, ListChecks, Settings, XIcon } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { JsonEditor } from "@/components/json-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  FONT_OPTIONS,
  THEME_COLOR_KEYS,
  effectiveColor,
  effectiveFont,
  type FontSlot,
} from "@/lib/custom-theme";
import {
  FONT_SCALE,
  FONT_SCALE_LEVELS,
  fontScalePercentLabel,
} from "@/lib/font-scale";
import type { SettingsFieldOpenRequest } from "@/lib/settings-field-widgets";
import { useCustomTheme } from "@/lib/use-custom-theme";
import { useFont } from "@/lib/use-font";
import { useFontScale } from "@/lib/use-font-scale";
import { useHexDraft } from "@/lib/use-hex-draft";
import { useSettingsPopover } from "@/lib/use-settings-popover";
import { useSettingsJsonView } from "@/lib/use-settings-json-view";
import { useThemeToggle } from "@/lib/use-theme-toggle";
import { cn } from "@/lib/utils";

const SETTINGS_TEXT = {
  trigger: "settings",
  title: "settings",
  close: "close settings",
  editInJson: "edit in json",
  editInForm: "edit in form",
  fonts: "fonts",
  fontSize: "font size",
  reset: "reset",
  fontLabels: { ui: "ui font", mono: "code font" },
  theme: "theme",
  mode: "mode",
  light: "light",
  dark: "dark",
  modifying: "modifying",
  themeMode: "theme mode",
  colorLabels: { primary: "primary", secondary: "secondary" },
  colorHints: {
    primary: "buttons, highlights, active states",
    secondary: "comment cards, muted surfaces",
  },
  resetMode: "reset colors for this mode",
  hexLabel: "hex",
  jsonHint:
    "every setting is listed. click a swatch or ▾ to pick a value. valid json applies as you type.",
  jsonLabel: "settings json",
  jsonValid: "valid · applied",
  loadDefaults: "load defaults",
  copyJson: "copy settings json",
} as const;

const THUMB_HALF_WIDTH_PX = 6;
const JSON_EDITOR_FONT = { minSize: 12, maxSize: 12, defaultSize: 12 } as const;

export function SettingsPopover() {
  const { isOpen, isFromPalette, handleOpenChange } = useSettingsPopover();

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            aria-label={SETTINGS_TEXT.trigger}
          />
        }
      >
        <Settings />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        finalFocus={!isFromPalette}
        className="max-h-(--available-height) w-lg max-w-[calc(100vw-1rem)] gap-4 overflow-y-auto border-2 border-border p-4 text-xs/relaxed shadow-2xl shadow-black/50 ring-0"
      >
        <SettingsBody />
      </PopoverContent>
    </Popover>
  );
}

function SettingsBody() {
  const [isJsonView, setIsJsonView] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <PopoverTitle>{SETTINGS_TEXT.title}</PopoverTitle>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="ml-auto"
          onClick={() => setIsJsonView(!isJsonView)}
        >
          {isJsonView ? <ListChecks /> : <Braces />}
          {isJsonView ? SETTINGS_TEXT.editInForm : SETTINGS_TEXT.editInJson}
        </Button>
        <PopoverClose
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={SETTINGS_TEXT.close}
            />
          }
        >
          <XIcon />
        </PopoverClose>
      </div>
      {isJsonView ? <SettingsJsonView /> : <SettingsForm />}
    </>
  );
}

function SettingsForm() {
  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title={SETTINGS_TEXT.fonts}>
        <FontScaleSetting />
        <FontSetting slot="ui" />
        <FontSetting slot="mono" />
      </SettingsSection>
      <div className="h-px w-full bg-border" />
      <SettingsSection title={SETTINGS_TEXT.theme}>
        <ThemeColorsSetting />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FontScaleSetting() {
  const labelId = useId();
  const { level, setFontScaleLevel, resetFontScale } = useFontScale();
  const levelSpan = FONT_SCALE.maxLevel - FONT_SCALE.minLevel;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span id={labelId}>{SETTINGS_TEXT.fontSize}</span>
        <span className="font-mono text-10 text-muted-foreground">
          {fontScalePercentLabel(level)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto"
          disabled={level === FONT_SCALE.defaultLevel}
          onClick={resetFontScale}
        >
          {SETTINGS_TEXT.reset}
        </Button>
      </div>
      <div className="flex flex-col gap-1.5 px-3">
        <Slider
          aria-labelledby={labelId}
          min={FONT_SCALE.minLevel}
          max={FONT_SCALE.maxLevel}
          step={1}
          value={[level]}
          onValueChange={(value) =>
            setFontScaleLevel(Array.isArray(value) ? value[0] : value)
          }
        />
        <div className="relative h-4">
          {FONT_SCALE_LEVELS.map((tickLevel) => (
            <button
              key={tickLevel}
              type="button"
              tabIndex={-1}
              onClick={() => setFontScaleLevel(tickLevel)}
              className={cn(
                "absolute top-0 -translate-x-1/2 cursor-pointer font-mono text-10 leading-none text-muted-foreground transition-colors hover:text-foreground",
                tickLevel === level && "text-foreground"
              )}
              style={{
                left: `calc(${THUMB_HALF_WIDTH_PX}px + (100% - ${THUMB_HALF_WIDTH_PX * 2}px) * ${(tickLevel - FONT_SCALE.minLevel) / levelSpan})`,
              }}
            >
              {fontScalePercentLabel(tickLevel)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FontSetting({ slot }: { slot: FontSlot }) {
  const { theme, setFont } = useCustomTheme();
  const options = FONT_OPTIONS[slot];
  const items = options.map((option) => ({ value: option.id, label: option.label }));

  return (
    <div className="flex items-center gap-2">
      <span>{SETTINGS_TEXT.fontLabels[slot]}</span>
      <Select
        items={items}
        value={effectiveFont(theme, slot)}
        onValueChange={(value) => setFont(slot, value ?? null)}
      >
        <SelectTrigger
          size="xs"
          className="ml-auto min-w-40 border-border bg-background"
          aria-label={SETTINGS_TEXT.fontLabels[slot]}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              style={{ fontFamily: option.family }}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ThemeColorsSetting() {
  const { isDark, setTheme } = useThemeToggle();
  const { theme, setColor, resetMode } = useCustomTheme();
  const mode = isDark ? "dark" : "light";
  const hasCustomColors = Object.keys(theme[mode]).length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span>{SETTINGS_TEXT.mode}</span>
        <span className="ml-auto flex">
          <Button
            type="button"
            variant={isDark ? "outline" : "default"}
            size="xs"
            onClick={() => setTheme(false)}
            aria-pressed={!isDark}
          >
            {SETTINGS_TEXT.light}
          </Button>
          <Button
            type="button"
            variant={isDark ? "default" : "outline"}
            size="xs"
            className="border-l-0"
            onClick={() => setTheme(true)}
            aria-pressed={isDark}
          >
            {SETTINGS_TEXT.dark}
          </Button>
        </span>
      </div>
      <p className="text-muted-foreground" aria-live="polite">
        {SETTINGS_TEXT.modifying}{" "}
        <span className="text-foreground">{mode}</span>{" "}
        {SETTINGS_TEXT.themeMode}
      </p>
      {THEME_COLOR_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span className="flex min-w-0 flex-col">
            <span>{SETTINGS_TEXT.colorLabels[key]}</span>
            <span className="truncate text-10 text-muted-foreground">
              {SETTINGS_TEXT.colorHints[key]}
            </span>
          </span>
          <span className="ml-auto flex items-center gap-1">
            <ColorInput
              key={`${mode}-${key}`}
              label={`${mode} ${SETTINGS_TEXT.colorLabels[key]}`}
              hex={effectiveColor(theme, mode, key)}
              onChange={(hex) => setColor(mode, key, hex)}
            />
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={!theme[mode][key]}
              onClick={() => setColor(mode, key, null)}
            >
              {SETTINGS_TEXT.reset}
            </Button>
          </span>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="self-start"
        disabled={!hasCustomColors}
        onClick={() => resetMode(mode)}
      >
        {SETTINGS_TEXT.resetMode}
      </Button>
    </div>
  );
}

interface ColorInputProps {
  label: string;
  hex: string;
  onChange: (hex: string) => void;
}

function ColorInput({ label, hex, onChange }: ColorInputProps) {
  const { draft, isValid, handleDraftChange, handleDraftBlur } = useHexDraft(
    hex,
    onChange
  );

  return (
    <span className="flex items-center">
      <input
        type="color"
        value={hex}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className="size-6 cursor-pointer border border-border bg-transparent p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
      />
      <Input
        value={draft}
        onChange={handleDraftChange}
        onBlur={handleDraftBlur}
        aria-label={`${label} ${SETTINGS_TEXT.hexLabel}`}
        aria-invalid={!isValid}
        spellCheck={false}
        className="h-6 w-24 border border-l-0 border-border px-1.5 font-mono"
      />
    </span>
  );
}

function SettingsJsonView() {
  const {
    state: { text, errors, openField, extensions },
    editorRef,
    handleTextChange,
    loadDefaults,
    pickFieldValue,
    closeField,
  } = useSettingsJsonView();
  const { fontSize } = useFont(JSON_EDITOR_FONT);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground">{SETTINGS_TEXT.jsonHint}</p>
      <div className="h-80 border border-border">
        <JsonEditor
          ref={editorRef}
          value={text}
          onChange={handleTextChange}
          fontSize={fontSize}
          extensions={extensions}
          ariaLabel={SETTINGS_TEXT.jsonLabel}
        />
      </div>
      {errors.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-0.5 bg-destructive/10 p-2 font-mono text-10 text-destructive">
          {errors.map((error) => (
            <li key={`${error.path}-${error.message}`}>
              {error.path}: {error.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-mono text-10 text-muted-foreground">{SETTINGS_TEXT.jsonValid}</p>
      )}
      <div className="flex justify-end gap-1">
        <Button type="button" variant="outline" size="xs" onClick={loadDefaults}>
          {SETTINGS_TEXT.loadDefaults}
        </Button>
        <CopyButton value={text} ariaLabel={SETTINGS_TEXT.copyJson} />
      </div>
      <SettingsFieldPopover
        openField={openField}
        onPick={pickFieldValue}
        onClose={closeField}
      />
    </div>
  );
}

interface SettingsFieldPopoverProps {
  openField: SettingsFieldOpenRequest | null;
  onPick: (value: string) => void;
  onClose: () => void;
}

function SettingsFieldPopover({ openField, onPick, onClose }: SettingsFieldPopoverProps) {
  const anchorRect = openField?.anchorRect;
  const field = openField?.range.field;

  return (
    <Popover
      open={openField !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <PopoverContent
        side="bottom"
        align="start"
        className="w-auto"
        anchor={anchorRect ? { getBoundingClientRect: () => anchorRect } : undefined}
      >
        {openField && field?.kind === "color" && (
          <ColorInput
            label={openField.range.path}
            hex={openField.range.value}
            onChange={onPick}
          />
        )}
        {openField && field?.kind === "font" && (
          <div role="listbox" aria-label={openField.range.path} className="flex flex-col">
            {FONT_OPTIONS[field.slot].map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={option.id === openField.range.value}
                onClick={() => {
                  onPick(option.id);
                  onClose();
                }}
                className={cn(
                  "cursor-pointer px-2 py-1 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                  option.id === openField.range.value && "text-primary"
                )}
                style={{ fontFamily: option.family }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
