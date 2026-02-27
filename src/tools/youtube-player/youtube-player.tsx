import { Input } from "@/components/ui/input";
import { useYouTubePlayerWithCommands as useYouTubePlayer } from "@/tools/youtube-player/lib/use-youtube-player-commands";

export function YouTubePlayerTool() {
  const { url, embedUrl, handleUrlChange } = useYouTubePlayer();

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <Input
        value={url}
        onChange={handleUrlChange}
        placeholder="youtube url or id"
        className="rounded-none border-y-border font-mono"
      />
      <div className="flex flex-1 min-h-0 w-full items-center justify-center">
        <iframe
          title="youtube player"
          src={embedUrl}
          className="aspect-video w-full max-h-full max-w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
