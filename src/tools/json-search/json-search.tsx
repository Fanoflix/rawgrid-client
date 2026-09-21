import { FontSizeButtons } from "@/components/font-size-buttons";
import { ToolInfo } from "@/components/tool-info";
import { Input } from "@/components/ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { JsonEditor } from "@/components/json-editor";
import { highlightJson } from "@/lib/json-highlight";
import { useJsonSearchWithCommands as useJsonSearch } from "@/tools/json-search/lib/use-json-search-commands";
import { cn } from "@/lib/utils";
import { JSON_SEARCH_DEFAULTS } from "./lib/constants";

export function JsonSearchTool() {
  const {
    state,
    matches,
    config,
    error,
    isParsing,
    handleQueryChange,
    handleJsonChange,
    increaseFont,
    decreaseFont,
  } = useJsonSearch();

  const hasResults = matches.length > 0;

  return (
    <div className="flex h-full w-full flex-col gap-0 overflow-hidden">
      <div className="group items-center px-1 flex w-full gap-1 border-b border-border h-8">
        <ToolInfo
          name="json search"
          description="find field matches with optional line context."
          triggerText="help"
          detailed={
            <div className="flex flex-col gap-1">
              <div
                className="font-mono text-[11px] text-foreground"
                style={{
                  fontFamily:
                    "Consolas, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                }}
              >
                syntax: {"<fieldA, fieldB, fieldC...> [n1,n2]"}
              </div>
              <div className="text-muted-foreground flex flex-col gap-0.5">
                <span>n1 is the number of lines before each matched field</span>
                <span>n2 is the number of lines after each matched field</span>
              </div>
            </div>
          }
        />
        <Input
          value={state.query}
          onChange={handleQueryChange}
          placeholder="fields, fields [linesBefore,linesAfter]"
          className={cn(
            "min-w-0 flex-1 rounded-none font-mono text-xs",
            state.query === JSON_SEARCH_DEFAULTS.query && "text-foreground/85"
          )}
        />
        <span className="flex shrink-0 gap-0">
          <FontSizeButtons onIncrease={increaseFont} onDecrease={decreaseFont} />
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          className={`min-h-0 flex-1 overflow-hidden ${
            isParsing ? "blur-sm" : ""
          }`}
        >
          <ResizablePanel defaultSize={50} minSize={20}>
            <JsonSearchInput
              value={state.json}
              onChange={handleJsonChange}
              fontSize={state.fontSize}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50} minSize={20}>
            <JsonSearchResults
              error={error}
              hasResults={hasResults}
              matches={matches}
              hasFields={config.fields.length > 0}
              fontSize={state.fontSize}
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
  onChange: (value: string) => void;
  fontSize: number;
}

function JsonSearchInput({ value, onChange, fontSize }: JsonSearchInputProps) {
  return (
    <JsonEditor
      value={value}
      onChange={onChange}
      fontSize={fontSize}
      placeholder="paste json"
      ariaLabel="json to search"
    />
  );
}

interface JsonSearchResultsProps {
  error: string | null;
  hasResults: boolean;
  matches: { field: string; index: number; lines: string[] }[];
  hasFields: boolean;
  fontSize: number;
}

function JsonSearchResults({
  error,
  hasResults,
  matches,
  hasFields,
  fontSize,
}: JsonSearchResultsProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {error ? (
        <div
          className="h-full w-full p-3 font-mono text-destructive overflow-auto"
          style={{ fontSize }}
        >
          {error}
        </div>
      ) : hasResults ? (
        <div className="flex h-full w-full flex-col overflow-auto">
          {matches.map((match, index) => (
            <div
              key={`${match.field}-${match.index}-${index}`}
              className="border-b-2 border-dashed border-border px-3 py-2 font-mono whitespace-pre"
              style={{ fontSize }}
            >
              <HighlightedJson code={match.lines.join("\n")} />
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

// Search results are fragments, so they're colored statically rather than
// mounting an editor per match.
function HighlightedJson({ code }: { code: string }) {
  return (
    <span className="json-punctuation">
      {highlightJson(code).map((segment, index) =>
        segment.className ? (
          <span key={index} className={segment.className}>
            {segment.text}
          </span>
        ) : (
          segment.text
        )
      )}
    </span>
  );
}
