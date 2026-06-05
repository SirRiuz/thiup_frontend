import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import styles from "../../styles/components/post/PostReactionPicker.module.css";

const REACTIONS = [
  { id: "fire", emoji: "🔥", label: "fire" },
  { id: "seen", emoji: "👁", label: "seen" },
  { id: "solidarity", emoji: "✊", label: "solidarity" },
  { id: "skeptical", emoji: "🤔", label: "skeptical" },
  { id: "heartbreak", emoji: "💔", label: "heartbreak" },
];

// Margen mínimo del popover a los bordes del viewport.
const VIEWPORT_MARGIN = 8;
// El offset base del CSS (.popover { left: -8px }).
const BASE_LEFT_OFFSET = -8;
// Clamp del pico: que no caiga sobre las esquinas redondeadas (radius 28px).
const TAIL_MIN_X = 24;

function PostReactionPicker({ onSelect, contextId, currentReactionEmoji }) {
  const [open, setOpen] = useState(false);
  // Desplazamiento horizontal para que el popover SIEMPRE quepa en el
  // viewport, y posición X del pico (relativa al popover) para que la colita
  // siga apuntando al '+' aunque el popover se haya desplazado.
  const [shiftX, setShiftX] = useState(0);
  const [tailX, setTailX] = useState(TAIL_MIN_X);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // Cálculo determinista e inmune al transform de la animación de entrada
  // (offsetWidth = ancho de layout; rects del wrapper/trigger, no del
  // popover escalado).
  const recalcShift = useCallback(() => {
    const wrapper = ref.current;
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!wrapper || !trigger || !popover) return;

    const baseLeft = wrapper.getBoundingClientRect().left + BASE_LEFT_OFFSET;
    const width = popover.offsetWidth;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - width;

    let shift = 0;
    if (baseLeft > maxLeft) shift = maxLeft - baseLeft; // se salía por la derecha
    if (baseLeft + shift < VIEWPORT_MARGIN) {
      shift = VIEWPORT_MARGIN - baseLeft; // nunca fuera por la izquierda
    }
    setShiftX(shift);

    // Pico apuntando al CENTRO del '+': su X es relativa al popover ya
    // desplazado (no centrado fijo). Clamp para no pisar las esquinas
    // redondeadas del popover.
    const triggerRect = trigger.getBoundingClientRect();
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const rawTailX = triggerCenter - (baseLeft + shift);
    setTailX(Math.max(TAIL_MIN_X, Math.min(width - TAIL_MIN_X, rawTailX)));
  }, []);

  // Pre-paint: medir y reposicionar ANTES de pintar (sin flash). Re-cálculo
  // en resize mientras esté abierto.
  useLayoutEffect(() => {
    if (!open) return undefined;
    recalcShift();
    window.addEventListener("resize", recalcShift);
    return () => window.removeEventListener("resize", recalcShift);
  }, [open, recalcShift]);

  // Cerrar al hacer SCROLL: un popover anclado no debe quedar flotando
  // desalineado cuando el contenido se mueve. capture:true porque el scroll
  // NO burbujea — con captura se atrapa también el de contenedores internos.
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener("scroll", close, { capture: true, passive: true });
    return () =>
      document.removeEventListener("scroll", close, { capture: true });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeydown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [open]);

  const handleSelect = (reaction) => {
    onSelect?.(reaction);
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="Add reaction"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        +
      </button>

      {open && (
        <div
          className={styles.popover}
          role="menu"
          ref={popoverRef}
          style={{ left: BASE_LEFT_OFFSET + shiftX }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`${styles.option} ${
                currentReactionEmoji === r.emoji ? styles.optionActive : ""
              }`}
              onClick={() => handleSelect(r)}
              role="menuitem"
              aria-label={r.label}
            >
              <span className={styles.tooltip}>{r.label}</span>
              <span className={styles.emoji}>{r.emoji}</span>
            </button>
          ))}
          {/* Colita estilo burbuja de chat, apuntando hacia el '+' (abajo —
              el popover se abre arriba del botón). Su left se calcula contra
              el centro del trigger, así sigue apuntando aunque haya shift. */}
          <span
            className={styles.tail}
            style={{ left: tailX }}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

export default PostReactionPicker;
