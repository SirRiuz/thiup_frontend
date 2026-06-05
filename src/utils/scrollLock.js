import { useEffect } from "react";

/**
 * Scroll-lock del body CENTRALIZADO con contador de referencias.
 *
 * Por qué: con manipulaciones directas de document.body.style.overflow
 * dispersas, dos lockers se pisan. Caso real (carga directa de /post/:id):
 * el splash bloquea (guarda ""), el Post bloquea durante su loading y guarda
 * "hidden" (¡el valor del splash!); el splash restaura "", y al terminar de
 * cargar el Post "restaura"... "hidden" → body bloqueado para siempre.
 *
 * Con el contador, el overflow original se guarda SOLO en la primera
 * adquisición y se restaura SOLO cuando se libera el último lock — múltiples
 * componentes pueden bloquear sin pisarse.
 */

let lockCount = 0;
let savedOverflow = "";

export function lockScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockScroll() {
  if (lockCount === 0) return; // nunca por debajo de 0
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
  }
}

/**
 * Hook: bloquea el scroll mientras `active` sea true. El unlock corre tanto
 * al pasar active a false (visibilidad) como en el unmount (cleanup) —
 * imposible dejar un lock huérfano.
 */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return () => unlockScroll();
  }, [active]);
}
