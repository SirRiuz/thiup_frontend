import { useEffect, useRef } from "react";

/**
 * Hook que observa un sentinel y dispara onLoadMore cuando entra al viewport.
 *
 * @param {function} onLoadMore  Handler a ejecutar.
 * @param {boolean}  hasMore     Si hay más data por cargar.
 * @param {boolean}  isLoading   Si ya está cargando (evita re-trigger).
 * @returns {React.MutableRefObject}  Ref a asignar al sentinel div.
 */
export function useInfiniteScroll({ onLoadMore, hasMore, isLoading }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "0px 0px 300px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return sentinelRef;
}
