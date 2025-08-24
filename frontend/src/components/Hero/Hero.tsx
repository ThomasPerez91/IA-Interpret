import styles from "./Hero.module.css";

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.container}>
        <div className={styles.copy}>
          <h1 id="hero-title">
            Analysez vos CSV.{" "}
            <span className={styles.highlight}>Entraînez</span> votre IA.
            <br />
            <span className={styles.sub}>Comprenez ses décisions.</span>
          </h1>
          <p className={styles.lead}>
            IA Interpret automatise l’ingestion de données, l’entraînement de
            modèles, et vous montre des explications globales & locales pour
            interpréter les performances de l’IA en quelques minutes.
          </p>
          <div className={styles.actions}>
            <a className={styles.primary} href="/login">
              Commencer
            </a>
            <a className={styles.secondary} href="#features">
              Voir les fonctionnalités
            </a>
          </div>
        </div>

        <div className={styles.art}>
          <svg
            className={styles.svg}
            viewBox="0 0 600 400"
            role="img"
            aria-label="Illustration IA"
          >
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#6366f1" />
                <stop offset="1" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <rect
              x="20"
              y="20"
              width="560"
              height="360"
              rx="16"
              fill="rgba(148,163,184,0.08)"
              stroke="rgba(148,163,184,0.25)"
            />
            <g>
              <circle cx="180" cy="130" r="60" fill="url(#g)" opacity="0.35" />
              <circle cx="300" cy="210" r="90" fill="url(#g)" opacity="0.25" />
              <circle cx="420" cy="140" r="50" fill="url(#g)" opacity="0.35" />
            </g>
            <g fill="none" stroke="url(#g)" strokeWidth="2" opacity="0.55">
              <path d="M120,300 C220,260 260,320 360,280" />
              <path d="M200,260 C280,220 330,300 420,260" />
              <path d="M80,250 C180,200 340,220 500,220" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
};
