import type { ChangeEventHandler } from "react";

import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useJsonSearch } from "@/tools/json-search/lib/use-json-search";

export function JsonSearchTool() {
  const {
    state,
    matches,
    config,
    error,
    isParsing,
    handleQueryChange,
    handleJsonChange,
  } = useJsonSearch();

  const hasResults = matches.length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-0 overflow-hidden">
      <div className="group flex w-full gap-0 border-b border-border">
        <Input
          value={state.query}
          onChange={handleQueryChange}
          placeholder="fields, fields [linesBefore,linesAfter]"
          className="min-w-0 flex-1 rounded-none font-mono text-xs"
        />
        <Tooltip>
          <TooltipTrigger
            type="button"
            className="rounded-none border border-border p-2 text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="json search help"
            delay={75}
          >
            help
          </TooltipTrigger>
          <TooltipContent className="max-w-xs border border-border p-4 text-xs">
            <HelpText />
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className={`min-h-0 flex-1 overflow-hidden ${
            isParsing ? "blur-sm" : ""
          }`}
        >
          <ResizablePanel defaultSize={50} minSize={20}>
            <JsonSearchInput value={state.json} onChange={handleJsonChange} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50} minSize={20}>
            <JsonSearchResults
              error={error}
              hasResults={hasResults}
              matches={matches}
              hasFields={config.fields.length > 0}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
        {isParsing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs text-muted-foreground">
            parsing json…
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface JsonSearchInputProps {
  value: string;
  onChange: ChangeEventHandler<HTMLTextAreaElement>;
}

function JsonSearchInput({ value, onChange }: JsonSearchInputProps) {
  return (
    <Textarea
      value={value}
      onChange={onChange}
      placeholder="paste json"
      className="h-full w-full min-h-0 resize-none rounded-none font-mono text-xs"
    />
  );
}

interface JsonSearchResultsProps {
  error: string | null;
  hasResults: boolean;
  matches: { field: string; index: number; lines: string[] }[];
  hasFields: boolean;
}

function JsonSearchResults({
  error,
  hasResults,
  matches,
  hasFields,
}: JsonSearchResultsProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {error ? (
        <div className="h-full w-full p-3 font-mono text-xs text-destructive overflow-auto">
          {error}
        </div>
      ) : hasResults ? (
        <div className="flex h-full w-full flex-col overflow-auto">
          {matches.map((match, index) => (
            <div
              key={`${match.field}-${match.index}-${index}`}
              className="border-b-2 border-dashed border-border px-3 py-2 font-mono text-xs whitespace-pre"
            >
              {match.lines.join("\n")}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
          {hasFields ? "no matches" : "add fields to search"}
        </div>
      )}
    </div>
  );
}

function HelpText() {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="font-mono text-[11px]"
        style={{
          fontFamily:
            "Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        }}
      >
        Syntax: {"<fieldA, fieldB, fieldC...> [n1,n2]"}
      </div>
      <div className="text-muted-foreground">
        n1 is the number of lines before each matched field, and n2 is the
        number of lines after each matched field.
      </div>
    </div>
  );
}
