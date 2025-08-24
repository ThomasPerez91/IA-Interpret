import styles from "./css/Dashboard.module.css";
import { useAuth } from "../auth/AuthContext";

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h1>Dashboard</h1>
        <button onClick={logout} className={styles.logout}>
          Se déconnecter
        </button>
      </div>

      <div className={styles.card}>
        <h2>Bienvenue {user?.username}</h2>
        <p>
          Ici on ajoutera : upload CSV, configuration du pré-traitement,
          lancement d'entraînement, et visualisation des performances /
          explications.
        </p>
      </div>
    </div>
  );
};
