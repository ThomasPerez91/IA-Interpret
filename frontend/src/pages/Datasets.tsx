import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { listDatasets, deleteDataset } from "../api/datasets";
import type { DatasetInfo } from "../types/datasets";
import styles from "./css/Datasets.module.css";
import { UploadModal } from "../components/Datasets/UploadModal";
import { RowActions } from "../components/Datasets/RowActions";
import { DatasetInfoModal } from "../components/Datasets/DatasetInfoModal";
import {
  statusLabel,
  stepLabel,
  statusClass,
  stepClass,
} from "../utils/labels";

export const Datasets: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [openUpload, setOpenUpload] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listDatasets(token);
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenInfo = (id: string) => {
    setInfoId(id);
    setInfoOpen(true);
  };

  const onArchive = async (id: string) => {
    if (!token) return;
    if (
      !window.confirm(
        "Archiver ce dataset ? Cela supprime aussi les données HDFS et l'analyse liée."
      )
    )
      return;

    try {
      await deleteDataset(token, id);
      await load();
    } catch (e: unknown) {
      if (e instanceof Error) {
        alert(e.message);
      } else {
        alert("Suppression échouée");
      }
    }
  };

  const onNextStep = (id: string) => {
    // redirection vers la page de plan de nettoyage
    navigate(`/dashboard/datasets/${id}/cleaning`);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Mes datasets</h2>
        <button
          className={styles.uploadBtn}
          onClick={() => setOpenUpload(true)}
        >
          + Uploader un CSV
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: "42%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "4%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className={styles.thLeft}>Nom</th>
              <th>Longueur</th>
              <th className={styles.nowrap}># Colonnes</th>
              <th>Étape</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className={styles.center}>
                  Chargement…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.center}>
                  Aucun dataset pour l’instant
                </td>
              </tr>
            ) : (
              items.map((d) => (
                <tr key={d.id}>
                  <td className={styles.tdLeft}>{d.name}</td>
                  <td>{d.row_count ?? "—"}</td>
                  <td>{d.column_count ?? "—"}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[stepClass()]}`}>
                      {stepLabel[d.step]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        styles[statusClass(d.status)]
                      }`}
                    >
                      {statusLabel[d.status]}
                    </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <RowActions
                      onInfo={() => onOpenInfo(d.id)}
                      onNextStep={() => onNextStep(d.id)}
                      onArchive={() => void onArchive(d.id)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <UploadModal
        token={token!}
        isOpen={openUpload}
        onClose={() => setOpenUpload(false)}
        onUploaded={() => void load()}
      />

      {infoOpen && infoId && (
        <DatasetInfoModal
          token={token!}
          datasetId={infoId}
          onClose={() => {
            setInfoOpen(false);
            setInfoId(null);
          }}
          onGoNext={() => onNextStep(infoId!)}
        />
      )}
    </div>
  );
};
