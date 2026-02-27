import type { ComponentType } from "react";

import { ColorPickerTool } from "@/tools/color-picker/color-picker";
import { JwtDecoderTool } from "@/tools/jwt-decoder/jwt-decoder";
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
  | "json-search";

export interface ToolEntry {
  name: string;
  component: ComponentType;
}

export const TOOL_REGISTRY: Record<ToolId, ToolEntry> = {
  "unix-timestamp": { name: "Unix Timestamp", component: UnixTimestampTool },
  timer: { name: "Timer", component: TimerTool },
  "jwt-decoder": { name: "JWT Decoder", component: JwtDecoderTool },
  "color-picker": { name: "Color Picker", component: ColorPickerTool },
  "video-player": { name: "Video Player", component: VideoPlayerTool },
  "youtube-player": { name: "YouTube Player", component: YouTubePlayerTool },
  "stacked-textareas": {
    name: "Stacked Textareas",
    component: StackedTextareasTool,
  },
  "json-search": { name: "JSON Search", component: JsonSearchTool },
};

export const ALL_TOOL_IDS = Object.keys(TOOL_REGISTRY) as ToolId[];
