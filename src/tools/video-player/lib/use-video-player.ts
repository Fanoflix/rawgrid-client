import type { ChangeEvent, DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { deleteAppState, readAppState, writeAppState } from "@/lib/storage";
import {
  createVideoObjectUrl,
  isAcceptedVideoFile,
  revokeVideoObjectUrl,
} from "@/tools/video-player/lib/utils";

const VIDEO_FILE_KEY = "video-player:file";

export function useVideoPlayer() {
  const [filename, setFilename] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const hasEditedRef = useRef(false);

  const showFile = useCallback((file: File) => {
    revokeVideoObjectUrl(objectUrlRef.current);
    const url = createVideoObjectUrl(file);
    objectUrlRef.current = url;
    setVideoUrl(url);
    setFilename(file.name);
  }, []);

  useEffect(() => {
    let isMounted = true;
    readAppState<File>(VIDEO_FILE_KEY)
      .then((stored) => {
        if (isMounted && stored instanceof File && !hasEditedRef.current) {
          showFile(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
      revokeVideoObjectUrl(objectUrlRef.current);
    };
  }, [showFile]);

  const loadFile = useCallback(
    (file: File) => {
      setError(null);
      hasEditedRef.current = true;

      if (!isAcceptedVideoFile(file)) {
        setError(
          "Unsupported file format. Use mp4, webm, ogg, mov, mkv, or avi."
        );
        return;
      }

      showFile(file);
      writeAppState(VIDEO_FILE_KEY, file).catch(() => undefined);
    },
    [showFile]
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
    hasEditedRef.current = true;
    revokeVideoObjectUrl(objectUrlRef.current);
    objectUrlRef.current = null;
    setVideoUrl(null);
    setFilename("");
    setError(null);
    deleteAppState(VIDEO_FILE_KEY).catch(() => undefined);
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
