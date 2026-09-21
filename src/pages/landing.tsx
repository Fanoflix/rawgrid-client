import { Fragment, useEffect, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Binary,
  Braces,
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
import { useSwipeNavigate } from "@/lib/use-swipe-navigate";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const TOOLS = [
  {
    icon: Clock,
    name: "unix timestamp",
    description: "convert between unix timestamps and human-readable dates",
  },
  {
    icon: Hourglass,
    name: "timer",
    description: "configurable countdown timer with play/pause controls",
  },
  {
    icon: KeyRound,
    name: "jwt decoder",
    description: "decode and inspect json web tokens",
  },
  {
    icon: Palette,
    name: "color picker",
    description: "pick colors and convert between hex, rgb, and hsl",
  },
  {
    icon: Braces,
    name: "json prettify",
    description: "format, minify, and sort json keys",
  },
  {
    icon: FileJson,
    name: "json search",
    description: "paste json and search through nested fields",
  },
  {
    icon: Binary,
    name: "base64",
    description: "encode text to base64 and decode it back",
  },
  {
    icon: StickyNote,
    name: "stacked textareas",
    description: "quick notes, ideas, and todos",
  },
  {
    icon: Play,
    name: "video player",
    description: "drag-and-drop local video file player",
  },
  {
    icon: Youtube,
    name: "youtube player",
    description: "embed and watch youtube videos by url",
  },
];

const SHOWCASES = [
  {
    imageName: "keyboard-nav-showcase",
    imageAlt: "command palette filtering timer actions",
    title: "do everything via keyboard",
    description:
      "press ⌘K to start a timer, decode a token or switch themes without reaching for the mouse.",
  },
  {
    imageName: "spaces-editor-showcase",
    imageAlt: "dragging a tool onto another space in edit mode",
    title: "arrange your own grid",
    description:
      "drag tools between spaces, hide the ones you don't need, and the rest grow to fill the room.",
  },
];

const GITHUB_URL = "https://github.com/Fanoflix/rawgrid-client";

function ThemedLandingImage({
  imageName,
  alt,
  className,
}: {
  imageName: string;
  alt: string;
  className: string;
}) {
  return (
    <>
      <img
        src={`landing/${imageName}-light.png`}
        alt={alt}
        className={cn("block dark:hidden", className)}
      />
      <img
        src={`landing/${imageName}.png`}
        alt={alt}
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}

const HIGHLIGHTS = [
  "extreme care for UX",
  "drag & drop layout",
  "persistent",
  "no ads",
];

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function OpenToolboxButton({ size }: { size: "xs" | "default" }) {
  const swipeNavigate = useSwipeNavigate();

  return (
    <Button
      render={<Link to="/tools" />}
      onClick={(event) => {
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        swipeNavigate("/tools");
      }}
      size={size}
      className={size === "default" ? "gap-2 text-sm" : undefined}
    >
      open toolbox
      <ArrowRight className={size === "default" ? "size-4" : undefined} />
    </Button>
  );
}

function ContributeButton() {
  return (
    <Button
      render={<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" />}
      nativeButton={false}
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
  );
}

function CallToActionButtons() {
  return (
    <div className="flex items-center gap-2">
      <OpenToolboxButton size="default" />
      <ContributeButton />
    </div>
  );
}

const NAVBAR_BRAND_REVEAL_SCROLL_PX = 80;

function useHasScrolledPast(thresholdPx: number) {
  const [hasScrolledPast, setHasScrolledPast] = useState(
    () => window.scrollY > thresholdPx,
  );

  useEffect(() => {
    function updateHasScrolledPast() {
      setHasScrolledPast(window.scrollY > thresholdPx);
    }
    window.addEventListener("scroll", updateHasScrolledPast, { passive: true });
    return () => window.removeEventListener("scroll", updateHasScrolledPast);
  }, [thresholdPx]);

  return hasScrolledPast;
}

export function LandingPage() {
  const isNavbarBrandVisible = useHasScrolledPast(
    NAVBAR_BRAND_REVEAL_SCROLL_PX,
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-3 backdrop-blur">
        <span
          aria-hidden={!isNavbarBrandVisible}
          className={cn(
            "flex items-center gap-2 text-sm font-medium tracking-tight transition-all duration-200",
            isNavbarBrandVisible
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0",
          )}
        >
          <span aria-hidden className="rawgrid-logo size-6" />
          rawgrid
        </span>
        <div className="flex items-center gap-2">
          <OpenToolboxButton size="xs" />
          <Button
            size="xs"
            variant="outline"
            nativeButton={false}
            render={
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" />
            }
          >
            star // contribute
            <img
              src="github.svg"
              alt="GitHub"
              className="size-3 invert dark:invert-0"
            />
          </Button>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-20">
        <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
          <h1 className="flex items-center gap-3 text-[2rem]  font-thin tracking-tight sm:text-[3.25rem]">
            <span aria-hidden className="rawgrid-logo size-5 sm:size-8" />
            rawgrid
          </h1>

          <div className="h-px w-16 bg-primary" />

          <p className="text-base text-muted-foreground">
            handy engineering tools
          </p>

          <div className="mt-2">
            <CallToActionButtons />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground/70">
            {HIGHLIGHTS.map((highlight, index) => (
              <Fragment key={highlight}>
                {index > 0 && <span className="text-border">|</span>}
                <span>{highlight}</span>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="relative -mt-6 w-full max-w-5xl">
          <ThemedLandingImage
            imageName="hero"
            alt="rawgrid tools side by side in the grid"
            className="hero-image-fade w-full"
          />
          <p className="absolute inset-x-0 -bottom-6 mx-auto max-w-2xl px-6 text-center text-base text-muted-foreground leading-relaxed">
            everyday developer tools in one resizable, drag-and-drop grid. no
            sign-ups, no tracking — open source and runs entirely in your
            browser.
          </p>
        </div>

        <section className="w-full max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <div key={tool.name} className="flex items-start gap-3 p-4">
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

        <section className="flex w-full max-w-4xl flex-col gap-16">
          <h2 className="text-center text-lg font-semibold">features</h2>
          {SHOWCASES.map((showcase) => (
            <div
              key={showcase.title}
              className="grid items-center gap-8 sm:grid-cols-[3fr_2fr]"
            >
              <div>
                <ThemedLandingImage
                  imageName={showcase.imageName}
                  alt={showcase.imageAlt}
                  className="fade-to-background-edges w-full"
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{showcase.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {showcase.description}
                </p>
              </div>
            </div>
          ))}
        </section>

        <CallToActionButtons />
      </main>

      <footer className="flex items-center justify-center gap-1 border-t px-6 py-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span aria-hidden className="rawgrid-logo size-4" />
          rawgrid
        </span>
        <span>·</span>
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
          href={GITHUB_URL}
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
