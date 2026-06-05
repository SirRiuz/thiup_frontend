import MaskAvatar from "../MaskAvatar";
import HomeSearchBar from "./HomeSearchBar";
import styles from "../../styles/components/home/HomeTopBar.module.css";

function HomeTopBar({ currentUserMask }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.inner}>
        <a href="/home" className={styles.logo}>
          thiup<span className={styles.logoUnderscore}>_</span>
        </a>
        <div className={styles.searchWrap}>
          <HomeSearchBar />
        </div>
        <span className={styles.spacer} />
        <div className={styles.userAvatar}>
          {/* Mientras /me/ carga, el avatar simplemente no se pinta. */}
          {currentUserMask && (
            <MaskAvatar seed={currentUserMask.id} size={26} />
          )}
        </div>
      </div>
    </header>
  );
}

export default HomeTopBar;
