import { useCallback, useRef, useState } from "react";

// A drag carrying files always lists "Files" in dataTransfer.types (before
// drop, that's ALL the browser exposes — no name/size/type yet, for
// security). Used to ignore a text/link drag (never show the file overlay
// for those) without waiting for the drop itself.
const hasFilePayload = (dt) =>
  !!dt && Array.from(dt.types || []).includes("Files");

/**
 * Wires HTML5 drag-and-drop onto a container via React's synthetic events
 * (spread `dropProps` onto the container's JSX). `onFiles` receives the
 * dropped FileList — the SAME shape the hidden file input's onChange and a
 * clipboard paste already hand to the composer's addFiles.
 *
 * dragenter/dragleave use a DEPTH COUNTER: every descendant fires its own
 * enter/leave as the pointer crosses it (that's how the DOM works), which
 * would otherwise flicker `isDragging` off mid-drag over a child element —
 * only the counter reaching 0 means the pointer actually left the container.
 */
export default function useFileDrop({ onFiles, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const depthRef = useRef(0);

  const onDragEnter = useCallback(
    (e) => {
      if (disabled || !hasFilePayload(e.dataTransfer)) return;
      e.preventDefault();
      depthRef.current += 1;
      setIsDragging(true);
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (e) => {
      if (disabled || !hasFilePayload(e.dataTransfer)) return;
      // Required every time: without it the browser never allows a drop here.
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    [disabled]
  );

  const onDragLeave = useCallback(
    (e) => {
      if (disabled) return;
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setIsDragging(false);
    },
    [disabled]
  );

  const onDrop = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      depthRef.current = 0;
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) onFiles(files);
    },
    [disabled, onFiles]
  );

  return {
    isDragging,
    dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
