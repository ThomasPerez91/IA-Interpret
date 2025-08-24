import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Register.module.css";
import { api } from "../lib/api";
import type { User } from "./AuthContext";

export const Register: React.FC = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    try {
      await api<User>("/users", {
        method: "POST",
        body: { username, email, password },
      });
      setOk(true);
      setTimeout(() => navigate("/login"), 700);
    } catch (e: unknown) {
      setErr(
        typeof e === "object" && e !== null && "message" in e
          ? String((e as { message: unknown }).message)
          : "Inscription impossible"
      );
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1>Inscription</h1>
        <p className={styles.sub}>Créez votre compte pour démarrer.</p>

        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>

        <label>
          Mot de passe
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>

        {err && <div className={styles.error}>{err}</div>}
        {ok && <div className={styles.success}>Compte créé ! Redirection…</div>}

        <button className={styles.submit}>Créer mon compte</button>

        <p className={styles.bottomLine}>
          Déjà un compte ?{" "}
          <Link to="/login" className={styles.bottomLink}>
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
};
