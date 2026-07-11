import { useEffect, useState } from "react";

/**
 * True on small screens. Uses the same 700px breakpoint as the nav
 * (NavRail/AppShell switch to the bottom bar there), so presentations stay in
 * sync: e.g. anchored popover on desktop vs. bottom sheet on mobile.
 *
 * SSR/no-matchMedia safe (returns false).
 */
export function useIsMobile(query = "(max-width: 700px)") {
  const get = () =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(query).matches
      : false;

  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    // addEventListener is the modern API; addListener is the Safari fallback.
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    onChange();
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return isMobile;
}
