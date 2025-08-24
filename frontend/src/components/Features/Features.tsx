import styles from "./Features.module.css";

type Feature = {
  title: string;
  description: string;
  illustration: React.ReactNode;
};

const features: Feature[] = [
  {
    title: "Upload & analyse de CSV",
    description:
      "Glissez-déposez vos fichiers. Sélectionnez les traitements (nettoyage, encodage, normalisation, split train/test). L’analyse exploratoire révèle distributions, valeurs manquantes et corrélations en un clin d'œil.",
    illustration: <div className={styles.illusOne} aria-hidden="true" />,
  },
  {
    title: "Entraînement de modèles IA",
    description:
      "Choisissez votre algorithme (baseline, tree-based, réseau léger). Suivi des métriques pendant l’entraînement, cross-validation et sauvegarde des artefacts pour la reproductibilité.",
    illustration: <div className={styles.illusTwo} aria-hidden="true" />,
  },
  {
    title: "Interprétabilité globale & locale",
    description:
      "Visualisez l’importance des variables, les partial dependence plots et les explications locales (SHAP-like) pour comprendre chaque prédiction et ajuster vos features.",
    illustration: <div className={styles.illusThree} aria-hidden="true" />,
  },
];

export const Features: React.FC = () => {
  return (
    <section
      id="features"
      className={styles.section}
      aria-labelledby="features-title"
    >
      <div className={styles.container}>
        <h2 id="features-title" className={styles.title}>
          Fonctionnalités clés
        </h2>

        <div className={styles.grid}>
          {features.map((f, idx) => {
            const reverse = idx % 2 === 1;
            return (
              <article
                key={f.title}
                className={`${styles.item} ${reverse ? styles.reverse : ""}`}
              >
                <div className={styles.text}>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </div>
                <div className={styles.visual}>{f.illustration}</div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
