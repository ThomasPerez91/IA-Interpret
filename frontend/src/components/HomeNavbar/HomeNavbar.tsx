import styles from "./HomeNavbar.module.css";

export const HomeNavbar: React.FC = () => {
  return (
    <header className={styles.wrapper}>
      <div className={styles.container}>
        <a className={styles.brand} href="/">
          <span className={styles.logo}>IA</span>
          <span className={styles.brandText}>Interpret</span>
        </a>

        <nav className={styles.nav}>
          <a href="#features">Fonctionnalités</a>
          <a href="#how">Comment ça marche</a>
          <a className={styles.cta} href="/login">
            Commencer
          </a>
        </nav>
      </div>
    </header>
  );
};
