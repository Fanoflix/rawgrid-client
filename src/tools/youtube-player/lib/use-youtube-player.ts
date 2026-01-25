import type { ChangeEvent } from "react"
import { useMemo } from "react"

import { useToolHistory } from "@/lib/use-tool-history"
import {
  DEFAULT_VIDEO_ID,
  DEFAULT_YOUTUBE_URL,
} from "@/tools/youtube-player/lib/constants"
import { extractYouTubeId } from "@/tools/youtube-player/lib/utils"

function serializeUrl(value: string) {
  return value
}

function deserializeUrl(value: string) {
  return value || DEFAULT_YOUTUBE_URL
}

export function useYouTubePlayer() {
  const { value: url, setValue: setUrl } = useToolHistory<string>({
    tool: "youtube-player",
    initialValue: DEFAULT_YOUTUBE_URL,
    serialize: serializeUrl,
    deserialize: deserializeUrl,
  })

  const embedUrl = useMemo(() => {
    const id = extractYouTubeId(url) ?? DEFAULT_VIDEO_ID
    return `https://www.youtube-nocookie.com/embed/${id}`
  }, [url])

  function handleUrlChange(event: ChangeEvent<HTMLInputElement>) {
    setUrl(event.target.value)
  }

  return {
    url,
    embedUrl,
    handleUrlChange,
  }
}
