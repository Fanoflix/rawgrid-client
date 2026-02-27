import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock,
  FileJson,
  Hourglass,
  KeyRound,
  Palette,
  Play,
  StickyNote,
  Youtube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const TOOLS = [
  { icon: Clock, name: "unix timestamp", description: "convert between unix timestamps and human-readable dates" },
  { icon: Hourglass, name: "timer", description: "configurable countdown timer with play/pause controls" },
  { icon: KeyRound, name: "jwt decoder", description: "decode and inspect json web tokens" },
  { icon: Palette, name: "color picker", description: "pick colors and convert between hex, rgb, and hsl" },
  { icon: Play, name: "video player", description: "drag-and-drop local video file player" },
  { icon: Youtube, name: "youtube player", description: "embed and watch youtube videos by url" },
  { icon: StickyNote, name: "stacked textareas", description: "quick notes, ideas, and todos" },
  { icon: FileJson, name: "json search", description: "paste json and search through nested fields" },
];

const KEYWORDS = ["timestamps", "jwt", "colors", "json", "timers", "videos", "notes", "search"];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* navbar */}
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-sm font-medium tracking-tight">rawgrid</span>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline">
            <a
              href="https://github.com/Fanoflix/rawgrid-client"
              target="_blank"
              rel="noopener noreferrer"
              className="font-thin text-foreground flex items-center gap-1.75"
            >
              star // contribute
              <img
                src="github.svg"
                alt="GitHub"
                className="size-3 invert dark:invert-0"
              />
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </nav>

      {/* hero */}
      <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-20">
        <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
          {/* floating keyword pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {KEYWORDS.map((word) => (
              <span
                key={word}
                className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {word}
              </span>
            ))}
          </div>

          <h1 className="text-[2.5rem] font-bold tracking-tight sm:text-[3.25rem]">
            small toolbox
          </h1>

          {/* accent line */}
          <div className="h-px w-16 bg-primary" />

          <p className="max-w-sm text-base text-muted-foreground leading-relaxed">
            everyday developer tools in one resizable, drag-and-drop grid.
            no sign-ups, no tracking — open source and runs entirely in your
            browser.
          </p>

          <div className="mt-2 flex items-center gap-2">
            <Button render={<Link to="/tools" />} size="default" className="gap-2 text-sm">
              open toolbox
              <ArrowRight className="size-4" />
            </Button>
            <Button
              render={
                <a
                  href="https://github.com/Fanoflix/rawgrid-client"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              size="default"
              variant="outline"
              className="gap-2 text-sm"
            >
              contribute
              <img
                src="github.svg"
                alt="GitHub"
                className="size-3.5 invert dark:invert-0"
              />
            </Button>
          </div>

          {/* stat line */}
          <div className="mt-2 flex items-center gap-4 text-[13px] text-muted-foreground/70">
            <span>8 tools</span>
            <span className="text-border">|</span>
            <span>drag & drop layout</span>
            <span className="text-border">|</span>
            <span>local storage</span>
          </div>
        </div>

        {/* screenshot */}
        <div className="w-full max-w-4xl overflow-hidden rounded-md border shadow-lg">
          <img
            src="rawgrid-screenshot.png"
            alt="rawgrid screenshot"
            className="w-full"
          />
        </div>

        {/* tools */}
        <section className="w-full max-w-3xl">
          <h2 className="mb-6 text-center text-lg font-semibold">tools</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="flex items-start gap-3 border p-4"
              >
                <tool.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tool.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* footer */}
      <footer className="flex items-center justify-center gap-1 border-t px-6 py-4 text-xs text-muted-foreground">
        <span>built by</span>
        <a
          href="https://ammarnasir.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          ammarnasir.com
        </a>
        <span>·</span>
        <a
          href="https://github.com/Fanoflix/rawgrid-client"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          github
        </a>
      </footer>
    </div>
  );
}
