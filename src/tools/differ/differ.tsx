import { ArrowLeftRight, ChevronDown, ChevronUp, X } from "lucide-react";

import { CopyButton } from "@/components/copy-button";
import { FontSizeButtons } from "@/components/font-size-buttons";
import { Hint } from "@/components/hint";
import { ToolInfo } from "@/components/tool-info";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiffSide } from "@/tools/differ/lib/constants";
import { DIFF_SIDES, DIFFER_COPY } from "@/tools/differ/lib/constants";
import type { SideErrors } from "@/tools/differ/lib/use-differ";
import type { DiffSummary } from "@/tools/differ/lib/utils";
import { describeChangePosition } from "@/tools/differ/lib/utils";
import { MergeEditor } from "@/tools/differ/merge-editor";
import { useDifferWithCommands as useDiffer } from "@/tools/differ/lib/use-differ-commands";

export function DifferTool() {
  const {
    state,
    editorRef,
    handleSideChange,
    handleSummaryChange,
    loadFile,
    toggleJsonMode,
    toggleIgnoreWhitespace,
    toggleCollapseUnchanged,
    swapSides,
    clearSide,
    goToChange,
    increaseFont,
    decreaseFont,
  } = useDiffer();

  const hasChanges = state.summary.changeCount > 0;
  const isEmpty = !state.original && !state.changed;
  const hasErrors = DIFF_SIDES.some((side) => state.errors[side]);

  return (
    <div className="flex h-full w-full flex-col gap-0 overflow-hidden">
      <div
        data-overflow-tooltip
        className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-1"
      >
        <ToolInfo
          name={DIFFER_COPY.name}
          description={DIFFER_COPY.description}
          triggerText={DIFFER_COPY.helpTrigger}
          detailed={DIFFER_COPY.help}
        />

        <ToggleButton
          label={DIFFER_COPY.json}
          hint={DIFFER_COPY.jsonHint}
          isOn={state.isJsonMode}
          onToggle={toggleJsonMode}
        />
        <ToggleButton
          label={DIFFER_COPY.whitespace}
          hint={DIFFER_COPY.whitespaceHint}
          isOn={state.isIgnoringWhitespace}
          onToggle={toggleIgnoreWhitespace}
        />
        <ToggleButton
          label={DIFFER_COPY.collapse}
          hint={DIFFER_COPY.collapseHint}
          isOn={state.isCollapsingUnchanged}
          onToggle={toggleCollapseUnchanged}
        />

        <Hint label={DIFFER_COPY.swap}>
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={swapSides}
            aria-label={DIFFER_COPY.swap}
          >
            <ArrowLeftRight />
          </Button>
        </Hint>

        <DiffStats summary={state.summary} isEmpty={isEmpty} />

        <span className="ml-auto flex shrink-0 items-center gap-0">
          {hasChanges && (
            <span className="px-1 font-mono text-10 text-muted-foreground tabular-nums">
              {describeChangePosition(state.summary)}
            </span>
          )}
          <Hint label={DIFFER_COPY.previous}>
            <span className="flex">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => goToChange(-1)}
                disabled={!hasChanges}
                aria-label={DIFFER_COPY.previous}
              >
                <ChevronUp />
              </Button>
            </span>
          </Hint>
          <Hint label={DIFFER_COPY.next}>
            <span className="mr-1 flex">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                onClick={() => goToChange(1)}
                disabled={!hasChanges}
                aria-label={DIFFER_COPY.next}
                className="border-l-0"
              >
                <ChevronDown />
              </Button>
            </span>
          </Hint>
          <FontSizeButtons onIncrease={increaseFont} onDecrease={decreaseFont} />
        </span>
      </div>

      <div className="flex h-7 shrink-0 border-b border-border">
        {DIFF_SIDES.map((side) => (
          <SideHeader
            key={side}
            side={side}
            value={state[side]}
            onClear={() => clearSide(side)}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <MergeEditor
          ref={editorRef}
          original={state.original}
          changed={state.changed}
          fontSize={state.fontSize}
          isJsonMode={state.isJsonMode}
          isIgnoringWhitespace={state.isIgnoringWhitespace}
          isCollapsingUnchanged={state.isCollapsingUnchanged}
          onSideChange={handleSideChange}
          onFileDrop={loadFile}
          onSummaryChange={handleSummaryChange}
        />
      </div>

      {hasErrors && <ErrorRow errors={state.errors} />}
    </div>
  );
}

interface ToggleButtonProps {
  label: string;
  hint: string;
  isOn: boolean;
  onToggle: () => void;
}

function ToggleButton({ label, hint, isOn, onToggle }: ToggleButtonProps) {
  return (
    <Hint label={hint}>
      <Button
        type="button"
        variant={isOn ? "default" : "outline"}
        size="xs"
        onClick={onToggle}
        aria-pressed={isOn}
        className="min-w-0 shrink"
      >
        <span className="truncate">{label}</span>
      </Button>
    </Hint>
  );
}

interface DiffStatsProps {
  summary: DiffSummary;
  isEmpty: boolean;
}

function DiffStats({ summary, isEmpty }: DiffStatsProps) {
  if (isEmpty) {
    return (
      <span className="min-w-0 truncate font-mono text-10 text-muted-foreground">
        {DIFFER_COPY.empty}
      </span>
    );
  }
  if (summary.changeCount === 0) {
    return (
      <span className="min-w-0 truncate font-mono text-10 text-muted-foreground">
        {DIFFER_COPY.identical}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 shrink gap-1.5 px-1 font-mono text-10 tabular-nums">
      <span className="text-(--diff-added)">+{summary.addedLines}</span>
      <span className="text-(--diff-removed)">−{summary.removedLines}</span>
    </span>
  );
}

interface SideHeaderProps {
  side: DiffSide;
  value: string;
  onClear: () => void;
}

function SideHeader({ side, value, onClear }: SideHeaderProps) {
  const label = DIFFER_COPY.sideLabels[side];
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-1 px-1",
        side === "changed" && "border-l border-border"
      )}
    >
      <span className="truncate bg-accent/50 p-1 font-mono text-10 text-muted-foreground">
        {label}
      </span>
      <span className="ml-auto flex shrink-0 gap-0">
        <CopyButton
          value={value}
          ariaLabel={`${DIFFER_COPY.copySide} ${label}`}
          isIconOnly
        />
        <Hint label={`${DIFFER_COPY.clearSide} ${label}`}>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            aria-label={`${DIFFER_COPY.clearSide} ${label}`}
            className="text-muted-foreground"
          >
            <X />
          </Button>
        </Hint>
      </span>
    </div>
  );
}

interface ErrorRowProps {
  errors: SideErrors;
}

function ErrorRow({ errors }: ErrorRowProps) {
  return (
    <div className="flex shrink-0 border-t border-border">
      {DIFF_SIDES.map((side) => (
        <p
          key={side}
          className={cn(
            "min-w-0 flex-1 px-1 py-1 font-mono text-10 wrap-break-word",
            errors[side] && "bg-destructive/10 text-destructive",
            side === "changed" && "border-l border-border"
          )}
        >
          {errors[side]}
        </p>
      ))}
    </div>
  );
}
