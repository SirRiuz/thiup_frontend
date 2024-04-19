import logo from "../assets/images/app.png";
import styles from "../styles/components/SplashScreen.module.css";

export default function SplashScreen() {
  return (
    <div className={styles.container}>
      <div
        className={styles.splash}
        style={{
          backgroundImage: `url(${logo})`,
        }}
      />
    </div>
  );
}
