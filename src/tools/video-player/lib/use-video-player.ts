import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useToolHistory } from "@/lib/use-tool-history";
import {
  createVideoObjectUrl,
  isAcceptedVideoFile,
  revokeVideoObjectUrl,
} from "@/tools/video-player/lib/utils";

function serializeFilename(value: string) {
  return value;
}

function deserializeFilename(value: string) {
  return value || "";
}

export function useVideoPlayer() {
  const { value: filename, setValue: setFilename } = useToolHistory<string>({
    tool: "video-player",
    initialValue: "",
    serialize: serializeFilename,
    deserialize: deserializeFilename,
  });

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    return () => {
      revokeVideoObjectUrl(objectUrlRef.current);
    };
  }, []);

  const loadFile = useCallback(
    (file: File) => {
      setError(null);

      if (!isAcceptedVideoFile(file)) {
        setError(
          "Unsupported file format. Use mp4, webm, ogg, mov, mkv, or avi."
        );
        return;
      }

      revokeVideoObjectUrl(objectUrlRef.current);

      const url = createVideoObjectUrl(file);
      objectUrlRef.current = url;
      setVideoUrl(url);
      setFilename(file.name);
    },
    [setFilename]
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) loadFile(file);
    if (event.target) event.target.value = "";
  }

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) loadFile(file);
  }

  function handleClear() {
    revokeVideoObjectUrl(objectUrlRef.current);
    objectUrlRef.current = null;
    setVideoUrl(null);
    setFilename("");
    setError(null);
  }

  return {
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
  };
}
