import { ACCEPTED_VIDEO_TYPES } from "@/tools/video-player/lib/constants";

export function isAcceptedVideoFile(file: File): boolean {
  if (
    file.type &&
    (ACCEPTED_VIDEO_TYPES as readonly string[]).includes(file.type)
  ) {
    return true;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "mkv", "avi"].includes(extension ?? "");
}

export function createVideoObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeVideoObjectUrl(url: string | null): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
