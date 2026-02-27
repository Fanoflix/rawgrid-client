import { Button } from "@/components/ui/button";
import { ACCEPTED_VIDEO_EXTENSIONS } from "@/tools/video-player/lib/constants";
import { useVideoPlayer } from "@/tools/video-player/lib/use-video-player";

export function VideoPlayerTool() {
  const {
    filename,
    videoUrl,
    isDragging,
    error,
    fileInputRef,
    handleFileChange,
    handleBrowseClick,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleClear,
  } = useVideoPlayer();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <div className="flex h-8 items-center justify-between border-b border-border px-2">
        <span className="truncate text-[10px] font-mono text-muted-foreground">
          {filename || "no file loaded"}
        </span>
        <div className="flex gap-0">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleBrowseClick}
          >
            browse
          </Button>
          {videoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleClear}
            >
              clear
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS}
        onChange={handleFileChange}
        className="hidden"
        aria-label="select video file"
      />

      <div
        className="flex min-h-0 flex-1 w-full items-center justify-center"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {videoUrl ? (
          <video src={videoUrl} controls className="max-h-full max-w-full">
            Your browser does not support the video tag.
          </video>
        ) : (
          <div
            className={[
              "flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border",
            ].join(" ")}
          >
            <span className="text-xs text-muted-foreground">
              drop a video file here
            </span>
            <span className="text-[10px] text-muted-foreground">
              mp4, webm, ogg, mov, mkv, avi
            </span>
            {error && (
              <span className="text-[10px] text-destructive">{error}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
