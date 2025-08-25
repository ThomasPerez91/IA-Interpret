import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listDatasets } from "../api/datasets";
import type { DatasetInfo } from "../types/datasets";
import styles from "./css/Datasets.module.css";
import { UploadModal } from "../components/Datasets/UploadModal";

export const Datasets: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listDatasets(token);
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2>Mes datasets</h2>
        <button className={styles.uploadBtn} onClick={() => setOpen(true)}>
          + Uploader un CSV
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {/* Largeurs fixes par colonne pour un alignement net */}
          <colgroup>
            <col style={{ width: "52%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>

          <thead>
            <tr>
              <th className={styles.thLeft}>Nom</th>
              <th className={styles.thLeft}>Longueur</th>
              <th className={styles.thLeft}># Colonnes</th>
              <th className={styles.thLeft}>Statut</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className={styles.center}>
                  Chargement…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.center}>
                  Aucun dataset pour l’instant
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id}>
                  <td className={styles.tdLeft}>{d.name}</td>
                  <td className={styles.tdLeft}>{d.row_count ?? "—"}</td>
                  <td className={styles.tdLeft}>{d.column_count ?? "—"}</td>
                  <td className={styles.tdLeft}>
                    <span className={`${styles.badge} ${styles[d.status]}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UploadModal
        token={token!}
        isOpen={open}
        onClose={() => setOpen(false)}
        onUploaded={() => load()}
      />
    </div>
  );
};
