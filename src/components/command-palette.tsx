import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { dispatch } from "@/lib/command-bus";

interface Command {
  id: string;
  label: string;
  group: string;
  command: string;
  param?: string;
}

const COMMANDS: Command[] = [
  { id: "timer-play", label: "play", group: "timer", command: "timer:play" },
  { id: "timer-pause", label: "pause", group: "timer", command: "timer:pause" },
  { id: "timer-stop", label: "stop", group: "timer", command: "timer:stop" },
  {
    id: "timer-set",
    label: "set time",
    group: "timer",
    command: "timer:set",
    param: "hh:mm:ss",
  },
  {
    id: "jwt-decode",
    label: "decode token",
    group: "jwt",
    command: "jwt:set",
    param: "paste token",
  },
  {
    id: "timestamp-convert",
    label: "convert",
    group: "timestamp",
    command: "timestamp:set",
    param: "timestamp value",
  },
  {
    id: "color-set",
    label: "set color",
    group: "color",
    command: "color:set",
    param: "#hex",
  },
  {
    id: "youtube-load",
    label: "load video",
    group: "youtube",
    command: "youtube:set",
    param: "youtube url",
  },
  {
    id: "notes-add",
    label: "add note",
    group: "notes",
    command: "notes:add",
    param: "note text",
  },
  {
    id: "json-load",
    label: "load json",
    group: "json search",
    command: "json:set",
    param: "paste json",
  },
  {
    id: "theme-dark",
    label: "dark mode",
    group: "theme",
    command: "theme:dark",
  },
  {
    id: "theme-light",
    label: "light mode",
    group: "theme",
    command: "theme:light",
  },
  {
    id: "layout-reset",
    label: "reset layout",
    group: "layout",
    command: "layout:reset",
  },
  {
    id: "layout-edit",
    label: "toggle edit mode",
    group: "layout",
    command: "layout:edit",
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCommand, setActiveCommand] = useState<Command | null>(null);
  const [paramValue, setParamValue] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const paramRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? COMMANDS.filter(
        (cmd) =>
          cmd.label.includes(query.toLowerCase()) ||
          cmd.group.includes(query.toLowerCase())
      )
    : COMMANDS;

  function open() {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
    setActiveCommand(null);
    setParamValue("");
  }

  function close() {
    setIsOpen(false);
    setActiveCommand(null);
  }

  function executeCommand(cmd: Command, param?: string) {
    dispatch(cmd.command, param);
    close();
  }

  function selectCommand(cmd: Command) {
    if (cmd.param) {
      setActiveCommand(cmd);
      setParamValue("");
    } else {
      executeCommand(cmd);
    }
  }

  // Cmd+K / Ctrl+K global listener
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened or switching modes
  useEffect(() => {
    if (!isOpen) return;
    if (activeCommand) {
      paramRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [isOpen, activeCommand]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-command-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function handleSearchKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && filtered[selectedIndex]) {
      event.preventDefault();
      selectCommand(filtered[selectedIndex]);
    } else if (event.key === "Escape") {
      close();
    }
  }

  function handleParamKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" && activeCommand) {
      event.preventDefault();
      executeCommand(activeCommand, paramValue);
    } else if (event.key === "Escape") {
      if (activeCommand) {
        setActiveCommand(null);
      } else {
        close();
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-background/85" onClick={close} />

      {/* palette */}
      <div className="relative z-10 w-full max-w-md border bg-background shadow-2xl">
        {activeCommand ? (
          /* param input mode */
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <span className="shrink-0 text-xs text-muted-foreground">
                {activeCommand.group} &rsaquo; {activeCommand.label}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                ref={paramRef}
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                onKeyDown={handleParamKeyDown}
                placeholder={activeCommand.param}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        ) : (
          /* search mode */
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleSearchKeyDown}
                placeholder="type a command..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
              <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                esc
              </kbd>
            </div>

            <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  no commands found
                </p>
              ) : (
                filtered.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    data-command-item
                    onClick={() => selectCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm",
                      index === selectedIndex
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground"
                    )}
                  >
                    <span className="shrink-0 text-xs text-muted-foreground w-20">
                      {cmd.group}
                    </span>
                    <span>{cmd.label}</span>
                    {cmd.param && (
                      <span className="ml-auto text-xs text-muted-foreground/50">
                        {cmd.param}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
