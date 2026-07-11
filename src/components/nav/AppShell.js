import { Outlet } from "react-router-dom";
import NavRail from "./NavRail";
import styles from "../../styles/components/nav/AppShell.module.css";

/**
 * ADDITIVE navigation shell: adds the NavRail (desktop capsule / mobile bottom
 * bar) around the wrapped screens (Home, Search) via layout route + <Outlet/>.
 * The screen content is NOT modified — it is only rendered inside; on mobile
 * the wrapper provides padding-bottom so the bottom bar does not cover
 * anything.
 */
function AppShell() {
  return (
    <>
      <NavRail />
      <div className={styles.content}>
        <Outlet />
      </div>
    </>
  );
}

export default AppShell;
