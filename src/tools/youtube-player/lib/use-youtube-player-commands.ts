import { useEffect } from "react";

import { subscribe } from "@/lib/command-bus";
import { useYouTubePlayer } from "@/tools/youtube-player/lib/use-youtube-player";

export function useYouTubePlayerWithCommands() {
  const youtubePlayer = useYouTubePlayer();

  useEffect(() => {
    return subscribe("youtube:set", (payload) => {
      if (payload) youtubePlayer.setUrl(payload);
    });
  });

  return youtubePlayer;
}
