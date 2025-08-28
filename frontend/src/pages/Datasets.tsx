import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { listDatasets, deleteDataset } from "../api/datasets";
import type { DatasetInfo } from "../types/datasets";
import styles from "./css/Datasets.module.css";
import { UploadModal } from "../components/Datasets/UploadModal";
import { RowActions } from "../components/Datasets/RowActions";
import { DatasetInfoModal } from "../components/Datasets/DatasetInfoModal";
import { ConfirmModal } from "../components/common/ConfirmModal";
import { statusLabel, stepLabel } from "../utils/labels";

export const Datasets: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [openUpload, setOpenUpload] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);
  const [infoId, setInfoId] = useState<string | null>(null);

  // état pour la modale de confirmation d’archivage
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);

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

  const askArchive = (id: string) => {
    setPendingArchiveId(id);
    setConfirmOpen(true);
  };

  const doArchive = async () => {
    if (!token || !pendingArchiveId) return;
    try {
      await deleteDataset(token, pendingArchiveId);
      setConfirmOpen(false);
      setPendingArchiveId(null);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Suppression échouée");
    }
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setPendingArchiveId(null);
  };

  const nameOf = (id: string) =>
    items.find((x) => x.id === id)?.name ?? "ce dataset";

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h2>Mes datasets</h2>
        <button
          className={styles.uploadBtn}
          onClick={() => setOpenUpload(true)}
        >
          + Uploader un CSV
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          {/* élargit un peu la colonne “# Colonnes” */}
          <colgroup>
            <col style={{ width: "38%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "6%" }} />
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
                    <span className={`${styles.badge} ${styles.step}`}>
                      {stepLabel[d.step] ?? d.step}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles[d.status]}`}>
                      {statusLabel[d.status] ?? d.status}
                    </span>
                  </td>
                  <td>
                    <RowActions
                      onInfo={() => onOpenInfo(d.id)}
                      onNextStep={() =>
                        alert("Étape suivante bientôt disponible")
                      }
                      onArchive={() => askArchive(d.id)}
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
          onGoNext={() => alert("Étape suivante bientôt disponible")}
        />
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="Archiver le dataset"
        message={`Tu es sur le point d’archiver « ${nameOf(
          pendingArchiveId ?? ""
        )} ». 
Cela supprimera l’entrée en base **et** les fichiers associés dans HDFS. Cette action est définitive.`}
        confirmText="Archiver"
        cancelText="Annuler"
        onConfirm={doArchive}
        onClose={closeConfirm}
        tone="danger"
      />
    </div>
  );
};
