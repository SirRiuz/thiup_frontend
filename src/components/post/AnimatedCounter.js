import { useEffect, useRef, useState } from "react";
import styles from "../../styles/components/post/AnimatedCounter.module.css";
import cx from "../../utils/cx";

/**
 * Odometer-style counter (X / Twitter look).
 *
 * When `value` changes:
 *   - new > old → slide up    (increment)
 *   - new < old → slide down  (decrement)
 *   - first render → no animation, static value
 *
 * Relies on CSS @keyframes for the slide; this component only schedules
 * the state transitions.
 */
function AnimatedCounter({ value, className }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animatingValue, setAnimatingValue] = useState(null);
  const [direction, setDirection] = useState(null);
  const previousValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousValueRef.current = value;
      setDisplayValue(value);
      return undefined;
    }

    const oldValue = previousValueRef.current;
    if (oldValue === value) return undefined;

    const newDirection = value > oldValue ? "up" : "down";
    setDirection(newDirection);
    setAnimatingValue(oldValue);
    setDisplayValue(value);
    previousValueRef.current = value;

    const timer = setTimeout(() => {
      setAnimatingValue(null);
      setDirection(null);
    }, 220);

    return () => clearTimeout(timer);
  }, [value]);

  if (animatingValue === null) {
    return (
      <span className={cx(styles.counter, className || "")}>
        <span className={styles.value}>{displayValue}</span>
      </span>
    );
  }

  return (
    <span
      className={cx(styles.counter, className || "")}
      aria-live="polite"
    >
      <span className={`${styles.column} ${styles[`column_${direction}`]}`}>
        {direction === "up" ? (
          <>
            <span className={styles.value}>{animatingValue}</span>
            <span className={styles.value}>{displayValue}</span>
          </>
        ) : (
          <>
            <span className={styles.value}>{displayValue}</span>
            <span className={styles.value}>{animatingValue}</span>
          </>
        )}
      </span>
    </span>
  );
}

export default AnimatedCounter;
