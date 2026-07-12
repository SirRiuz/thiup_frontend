import { forwardRef } from "react";
import styles from "../../styles/components/menu/MenuSurface.module.css";
import cx from "../../utils/cx";

/**
 * MenuSurface — THE floating menu panel (Threads' exact dropdown), shared by
 * every menu in the app (thread options, nav ☰). Purely presentational: the
 * caller owns positioning (inline fixed coords or an anchor class composed
 * via `className`), state, and the rows (use `menuStyles.item` / `.itemIcon`
 * / `.itemIconRight` / `.itemDanger` / `.divider` so every menu's rows read
 * identical). Forwards the ref (outside-click detection lives in callers).
 */
export const menuStyles = styles;

const MenuSurface = forwardRef(function MenuSurface(
  { className = "", children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cx(styles.menu, className)} role="menu" {...rest}>
      {children}
    </div>
  );
});

export default MenuSurface;
