import type { ComponentType } from "react";

import { Base64Tool } from "@/tools/base64/base64";
import { ColorPickerTool } from "@/tools/color-picker/color-picker";
import { JwtDecoderTool } from "@/tools/jwt-decoder/jwt-decoder";
import { JsonPrettifyTool } from "@/tools/json-prettify/json-prettify";
import { JsonSearchTool } from "@/tools/json-search/json-search";
import { StackedTextareasTool } from "@/tools/stacked-textareas/stacked-textareas";
import { TimerTool } from "@/tools/timer/timer";
import { UnixTimestampTool } from "@/tools/unix-timestamp/unix-timestamp";
import { VideoPlayerTool } from "@/tools/video-player/video-player";
import { YouTubePlayerTool } from "@/tools/youtube-player/youtube-player";

export type ToolId =
  | "unix-timestamp"
  | "timer"
  | "jwt-decoder"
  | "color-picker"
  | "video-player"
  | "youtube-player"
  | "stacked-textareas"
  | "json-search"
  | "base64"
  | "json-prettify";

export interface ToolEntry {
  name: string;
  /** A handful of words, shown in the top bar while the tool is hovered. */
  description: string;
  component: ComponentType;
}

export const TOOL_REGISTRY: Record<ToolId, ToolEntry> = {
  "unix-timestamp": {
    name: "Unix Timestamp",
    description: "convert epoch seconds to readable dates",
    component: UnixTimestampTool,
  },
  timer: {
    name: "Timer",
    description: "countdown with progress bar and alarm",
    component: TimerTool,
  },
  "jwt-decoder": {
    name: "JWT Decoder",
    description: "decode a token's header and payload",
    component: JwtDecoderTool,
  },
  "color-picker": {
    name: "Color Picker",
    description: "pick a color, copy hex, rgb or hsl",
    component: ColorPickerTool,
  },
  "video-player": {
    name: "Video Player",
    description: "play a local video file",
    component: VideoPlayerTool,
  },
  "youtube-player": {
    name: "YouTube Player",
    description: "paste a link and watch inline",
    component: YouTubePlayerTool,
  },
  "stacked-textareas": {
    name: "Stacked Textareas",
    description: "scratch notes across stackable text areas",
    component: StackedTextareasTool,
  },
  "json-search": {
    name: "JSON Search",
    description: "find keys and values inside json",
    component: JsonSearchTool,
  },
  base64: {
    name: "Base64",
    description: "encode and decode base64 both ways",
    component: Base64Tool,
  },
  "json-prettify": {
    name: "JSON Prettify",
    description: "format, minify and sort json keys",
    component: JsonPrettifyTool,
  },
};

export const ALL_TOOL_IDS = Object.keys(TOOL_REGISTRY) as ToolId[];
