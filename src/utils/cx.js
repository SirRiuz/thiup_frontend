/**
 * cx — join truthy class parts with a single space (a tiny, dependency-free
 * `classnames`). Filters out "", undefined, null and false, so a conditional
 * class that resolves to nothing never leaves a trailing or double space in
 * the class attribute (`cx(a, cond && b)` → "a" when cond is false, not "a ").
 *
 * Behaviour-equivalent to the template literals it replaces, minus the gaps:
 * every non-empty part is kept, in order, separated by exactly one space.
 */
export default function cx(...parts) {
  let out = "";
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    if (!p) continue;
    out = out ? `${out} ${p}` : String(p);
  }
  return out;
}
