import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import styles from "./DashboardNavbar.module.css";

export const DashboardNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/dashboard">
        <span className={styles.logo}>IA</span>
        <span className={styles.brandText}>Interpret</span>
      </a>

      <nav className={styles.nav}>
        <NavLink
          to="/dashboard/datasets"
          className={({ isActive }) => (isActive ? styles.active : "")}
        >
          Jeu de données
        </NavLink>
        <NavLink
          to="/dashboard/models"
          className={({ isActive }) => (isActive ? styles.active : "")}
        >
          Modèles d'IA
        </NavLink>
        <NavLink
          to="/dashboard/analyses"
          className={({ isActive }) => (isActive ? styles.active : "")}
        >
          Mes analyses
        </NavLink>
      </nav>

      <div className={styles.right} ref={ref}>
        <button className={styles.userBtn} onClick={() => setOpen((v) => !v)}>
          <span className={styles.userName}>
            {user?.username ?? "Utilisateur"}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M7 10l5 5 5-5z" />
          </svg>
        </button>

        {open && (
          <div className={styles.menu}>
            <button
              className={styles.menuItem}
              onClick={() => {
                setOpen(false);
                logout();
                navigate("/login");
              }}
            >
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
