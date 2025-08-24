import { type FormEvent, useState } from "react";
import { useAuth } from "./AuthContext";
import styles from "./Login.module.css";
import { useNavigate, Link } from "react-router-dom";

export const Login: React.FC = () => {
  const { loginWithPassword, loading } = useAuth();
  const [ident, setIdent] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await loginWithPassword(ident, password);
      navigate("/dashboard");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else {
        setErr("Impossible de se connecter");
      }
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1>Connexion</h1>
        <p className={styles.sub}>Entrez votre email ou votre username.</p>

        <label>
          Identifiant
          <input
            value={ident}
            onChange={(e) => setIdent(e.target.value)}
            placeholder="email@exemple.com ou username"
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            required
          />
        </label>

        {err && <div className={styles.error}>{err}</div>}

        <button className={styles.submit} disabled={loading}>
          {loading ? "Chargement…" : "Se connecter"}
        </button>

        <p className={styles.bottomLine}>
          Pas encore inscrit ?{" "}
          <Link to="/register" className={styles.bottomLink}>
            C’est par ici !
          </Link>
        </p>
      </form>
    </div>
  );
};
