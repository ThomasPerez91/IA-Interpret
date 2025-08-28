import { useEffect, useState } from "react";
import styles from "./DatasetInfoModal.module.css";
import { getDatasetDetail } from "../../api/datasets";
import type { DatasetDetail, SchemaField } from "../../types/datasets";
import { statusLabel, stepLabel } from "../../utils/labels";

type Props = {
  token: string;
  datasetId: string;
  onClose: () => void;
  onGoNext: () => void;
};

// Helpers de normalisation robustes (tolèrent null/string)
const asArrayOfStrings = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String);
  if (v == null) return [];
  return [String(v)];
};
const asRecordNum = (v: unknown): Record<string, number> => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const out: Record<string, number> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const n = Number(val);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  }
  return {};
};

export const DatasetInfoModal: React.FC<Props> = ({
  token,
  datasetId,
  onClose,
  onGoNext,
}) => {
  const [data, setData] = useState<DatasetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const d = await getDatasetDetail(token, datasetId);
        if (mounted) setData(d);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, datasetId]);

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const rowCount = data?.analysis?.row_count ?? 0;

  // ------- Normalisations sûres -------
  const schema: SchemaField[] = Array.isArray(data?.analysis?.schema)
    ? (data!.analysis!.schema as SchemaField[])
    : [];

  const nullCounts = asRecordNum(data?.analysis?.null_counts);
  const nonZeroNulls = Object.entries(nullCounts).filter(([, n]) => n > 0);
  const totalMissing = nonZeroNulls.reduce((acc, [, n]) => acc + n, 0);
  const colsWithMissing = nonZeroNulls.length;

  const badTypeCounts = asRecordNum(data?.analysis?.bad_type_counts);
  const badEntries = Object.entries(badTypeCounts).filter(([, n]) => n > 0);

  const constantCols = asArrayOfStrings(data?.analysis?.constant_columns);

  // -----------------------------------
  const percent1 = (n: number, total: number) => {
    if (!total) return 0;
    return Math.round((n / total) * 1000) / 10; // 1 décimale
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={stop}>
        <div className={styles.header}>
          <h3>Informations du dataset</h3>
          <div className={styles.actions}>
            <button className={styles.secondary} onClick={onClose}>
              Fermer
            </button>
            <button className={styles.primary} onClick={onGoNext}>
              Étape suivante
            </button>
          </div>
        </div>

        {loading && <div className={styles.loading}>Chargement…</div>}
        {err && <div className={styles.error}>{err}</div>}

        {data && (
          <>
            {/* Bandeau récap */}
            <div className={styles.banner}>
              <div>
                <span className={styles.k}>Nom</span>
                <span className={styles.v}>{data.name}</span>
              </div>

              <div>
                <span className={styles.k}>Fichier</span>
                <span className={styles.v}>{data.filename}</span>
              </div>

              <div>
                <span className={styles.k}>Étape</span>
                <span className={styles.v}>
                  {stepLabel[data.step] ?? data.step}
                </span>
              </div>

              <div>
                <span className={styles.k}>Statut</span>
                <span className={styles.v}>
                  {statusLabel[data.status] ?? data.status}
                </span>
              </div>

              <div>
                <span className={styles.k}>Longueur</span>
                <span className={styles.v}>{data.row_count ?? "—"}</span>
              </div>

              <div>
                <span className={styles.k}># Colonnes</span>
                <span className={styles.v}>{data.column_count ?? "—"}</span>
              </div>
            </div>

            {/* Analyse initiale */}
            {data.analysis ? (
              <div className={styles.sections}>
                {/* Schéma */}
                <section>
                  <h4>Schéma détecté</h4>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Colonne</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.length === 0 && (
                        <tr>
                          <td colSpan={2} className={styles.muted}>
                            Aucune information de schéma.
                          </td>
                        </tr>
                      )}
                      {schema.map((c: SchemaField, idx) => {
                        const typ =
                          (c as SchemaField).dtype ??
                          (c as SchemaField).type ??
                          "—";
                        return (
                          <tr key={`${c.name ?? idx}`}>
                            <td>{c.name ?? "—"}</td>
                            <td>
                              <span className={styles.badge}>{typ}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>

                {/* Valeurs manquantes */}
                <section>
                  <h4>Valeurs manquantes</h4>
                  {nonZeroNulls.length === 0 ? (
                    <div className={styles.muted}>
                      Aucune valeur manquante détectée.
                    </div>
                  ) : (
                    <>
                      <div className={styles.bars}>
                        {nonZeroNulls.map(([col, n]) => {
                          const p1 = percent1(n, rowCount);
                          return (
                            <div key={col} className={styles.barRow}>
                              <div className={styles.barLabel}>{col}</div>
                              <div className={styles.barTrack}>
                                <div
                                  className={styles.barFill}
                                  style={{ width: `${p1}%` }}
                                />
                              </div>
                              <div
                                className={`${styles.barValue} ${styles.num}`}
                              >
                                {n} ({p1}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className={styles.note}>
                        {totalMissing} valeur(s) manquante(s) sur{" "}
                        {colsWithMissing} colonne(s).
                      </div>
                    </>
                  )}
                </section>

                {/* Valeurs mal typées */}
                <section>
                  <h4>Valeurs mal typées</h4>
                  {badEntries.length === 0 ? (
                    <div className={styles.muted}>
                      Aucune valeur mal typée détectée.
                    </div>
                  ) : (
                    <div className={styles.kvList}>
                      {badEntries.map(([col, n]) => (
                        <div className={styles.kvRow} key={col}>
                          <div className={styles.kvKey}>{col}</div>
                          <div className={`${styles.kvVal} ${styles.num}`}>
                            {n}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Colonnes constantes */}
                <section>
                  <h4>Colonnes constantes</h4>
                  {constantCols.length === 0 ? (
                    <div className={styles.muted}>
                      Aucune colonne constante.
                    </div>
                  ) : (
                    <ul className={styles.taglist}>
                      {constantCols.map((c) => (
                        <li key={c} className={styles.tag}>
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : (
              <div className={styles.muted}>
                Aucune analyse disponible pour l’instant.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
