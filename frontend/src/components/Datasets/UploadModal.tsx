import { useEffect, useRef, useState } from "react";
import styles from "./UploadModal.module.css";
import { uploadDataset, getDatasetStatus } from "../../api/datasets";
import type { StatusResponse } from "../../types/datasets";

type Props = {
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void; // rafraîchir la liste
};

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_MS = 120000; // 2 min de patience

export const UploadModal: React.FC<Props> = ({
  token,
  isOpen,
  onClose,
  onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<StatusResponse["status"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [, setDatasetId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<number | null>(null);
  const pollStartRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollStartRef.current = null;
  };

  useEffect(() => {
    if (!isOpen) {
      // reset modal state
      setFile(null);
      setDatasetName("");
      setUploading(false);
      setProgress(0);
      setStatus(null);
      setError(null);
      setDone(false);
      setDatasetId(null);
      stopPolling();
    }
    return () => stopPolling();
  }, [isOpen]);

  if (!isOpen) return null;

  const beginPoll = (id: string) => {
    stopPolling();
    pollStartRef.current = Date.now();
    pollRef.current = window.setInterval(async () => {
      try {
        const s = await getDatasetStatus(token, id);
        setStatus(s.status);
        setProgress(s.progress);

        // Fin de traitement
        if (s.status === "done") {
          setDone(true);
          stopPolling();
          onUploaded(); // refresh la liste
          return;
        }
        if (s.status === "failed") {
          setError(s.error_message ?? "Le traitement a échoué.");
          setDone(true);
          stopPolling();
          return;
        }

        // Timeout si ça reste coincé (p.ex. task non enregistrée côté worker)
        const elapsed = Date.now() - (pollStartRef.current ?? Date.now());
        if (elapsed > MAX_POLL_MS) {
          setError(
            "Le traitement prend trop de temps (timeout). Réessaie plus tard."
          );
          setDone(true);
          stopPolling();
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Erreur de suivi du statut");
        setDone(true);
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Choisis un fichier CSV.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    setStatus("queued");

    try {
      const resp = await uploadDataset(token, file, datasetName || undefined);
      setDatasetId(resp.dataset_id);
      setProgress(10);
      beginPoll(resp.dataset_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload échoué");
      setUploading(false);
      setDone(true);
    }
  };

  const close = () => {
    // Ferme et stoppe tout, même en cours
    stopPolling();
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={close}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Uploader un CSV</h3>

        <label className={styles.label}>Nom (optionnel)</label>
        <input
          type="text"
          placeholder="Nom du dataset"
          value={datasetName}
          disabled={uploading}
          onChange={(e) => setDatasetName(e.target.value)}
          className={styles.input}
        />

        <div className={styles.fileRow}>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={styles.hiddenFile}
            disabled={uploading}
          />
          <button
            className={styles.selectBtn}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {file ? "Changer de fichier" : "Choisir un fichier CSV"}
          </button>
          <span className={styles.fileName}>
            {file?.name ?? "Aucun fichier sélectionné"}
          </span>
        </div>

        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={styles.progressLabel}>
            {status ? `Statut: ${status} (${progress}%)` : "En attente…"}
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {done && !error && (
          <div className={styles.success}>Analyse terminée avec succès 🎉</div>
        )}

        <div className={styles.actions}>
          {/* ⛔️ Le bouton Annuler reste toujours cliquable pour fermer & stopper le polling */}
          <button className={styles.cancel} onClick={close}>
            Annuler
          </button>

          {!done && (
            <button
              className={styles.upload}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "En cours…" : "Uploader"}
            </button>
          )}
          {done && (
            <button className={styles.ok} onClick={close}>
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
