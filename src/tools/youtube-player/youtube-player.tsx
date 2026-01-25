import { Input } from "@/components/ui/input"
import { useYouTubePlayer } from "@/tools/youtube-player/lib/use-youtube-player"

export function YouTubePlayerTool() {
  const { url, embedUrl, handleUrlChange } = useYouTubePlayer()

  return (
    <div className="flex h-full w-full flex-col gap-0">
      <Input
        value={url}
        onChange={handleUrlChange}
        placeholder="youtube url or id"
        className="rounded-none border-0 border-b border-border font-mono"
      />
      <div className="aspect-video w-full">
        <iframe
          title="youtube player"
          src={embedUrl}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
