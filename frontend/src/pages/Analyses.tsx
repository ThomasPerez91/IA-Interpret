import styles from "./css/Analyses.module.css";

export const Analyses: React.FC = () => {
  return (
    <div className={styles.wrap}>
      <h2>Mes analyses</h2>
      <p>
        À venir : performances globales, explications locales (SHAP-like), PDP,
        etc.
      </p>
    </div>
  );
};
