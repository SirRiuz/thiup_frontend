import { useEffect, useState } from "react";

/**
 * Whether `targetRef`'s bottom edge reaches `surfaceRef`'s bottom edge
 * (within `slack` px — the surface's own bottom padding).
 *
 * Drives the media mosaics' flush-into-the-rounded-corners treatment: the
 * -12px pull + `radius 0 0 24 24` must apply ONLY when the grid really ends
 * AT the card's bottom (the surface is min-height stretched, so a short grid
 * floats mid-card — rounding those tiles read broken).
 *
 * Stable by construction: applying the flush styles moves the grid's bottom
 * TOWARD the surface's bottom, so a flush verdict never un-flushes itself
 * (and vice versa). `measureKey` re-measures when the content changes
 * (e.g. the results length); resizes are observed.
 */
export default function useFlushBottom(
  targetRef,
  surfaceRef,
  enabled,
  measureKey,
  slack = 13
) {
  const [flush, setFlush] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setFlush(false);
      return undefined;
    }
    const target = targetRef.current;
    const surface = surfaceRef.current;
    if (!target || !surface) {
      setFlush(false);
      return undefined;
    }
    const measure = () => {
      const gap =
        surface.getBoundingClientRect().bottom -
        target.getBoundingClientRect().bottom;
      setFlush(gap <= slack + 0.5);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    observer.observe(surface);
    // Also every direct child of the surface: the grid's POSITION (not size)
    // shifts when siblings above it settle (profile header skeleton → real
    // stats), which resizes a child — position-only moves never fire a
    // ResizeObserver on the grid/surface themselves.
    Array.from(surface.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [targetRef, surfaceRef, enabled, measureKey, slack]);

  return flush;
}
