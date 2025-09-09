import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./css/CleaningPlan.module.css";
import { useAuth } from "../auth/AuthContext";
import { getCleaningPlan, saveCleaningPlan } from "../api/cleaning";
import {
  statusLabel,
  stepLabel,
  statusClass,
  stepClass,
} from "../utils/labels";

import type {
  CleaningPlanResponse,
  ColumnPlan,
  ColumnImputation,
} from "../types/datasets";

/* ---------- Libellés FR pour les imputations ---------- */
const IMP_LABELS: Record<ColumnImputation["method"], string> = {
  random_from_existing: "Valeur existante (aléatoire)",
  categorical_mode: "Modalité la plus fréquente",
  drop_row: "Supprimer la ligne",
  constant: "Valeur précise",
  choose_value: "Choisir une valeur",
  numeric_median: "Médiane",
  numeric_mean: "Moyenne",
  random_range: "Aléatoire (min,max)",
  median: "Médiane",
  mean: "Moyenne",
  mode: "Modalité la plus fréquente",
  min: "Minimum",
  max: "Maximum",
  random_between_min_max: "Aléatoire (entre min et max)",
  value: "Valeur",
};

const TARGET_OPTIONS: ReadonlyArray<ColumnPlan["target_type"]> = [
  "string",
  "int",
  "double",
  "boolean",
] as const;

/* Options d’imputation selon le type cible */
function imputeOptionsFor(
  target: ColumnPlan["target_type"]
): ReadonlyArray<ColumnImputation["method"]> {
  if (target === "int" || target === "double") {
    return [
      "numeric_median",
      "numeric_mean",
      "random_range",
      "drop_row",
      "constant",
    ];
  }
  if (target === "boolean") {
    return ["categorical_mode", "drop_row", "constant"];
  }
  // string
  return [
    "random_from_existing",
    "categorical_mode",
    "drop_row",
    "constant",
    "choose_value",
  ];
}

/* Mapping dtype Spark -> cible UI */
function dtypeToTarget(dtype?: string): ColumnPlan["target_type"] {
  const t = (dtype ?? "").toLowerCase();
  if (t.includes("int")) return "int";
  if (t.includes("double") || t.includes("float") || t.includes("decimal"))
    return "double";
  if (t.includes("bool")) return "boolean";
  return "string";
}

/* --------- Types locaux pour les métadonnées ---------- */
type ColumnStats = {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
};
type CleaningColumnBase = CleaningPlanResponse["columns"][number];
type CleaningColumnExtended = CleaningColumnBase & {
  distinct?: number;
  values?: string[];
  stats?: ColumnStats;
};
type ColumnMeta = {
  values?: ReadonlyArray<string>;
  stats?: ColumnStats;
  counts: { nulls: number; distinct?: number };
};

export const CleaningPlan: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [header, setHeader] = useState<CleaningPlanResponse["dataset"] | null>(
    null
  );
  const [rows, setRows] = useState<ColumnPlan[]>([]);
  const [colMeta, setColMeta] = useState<Record<string, ColumnMeta>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token || !id) return;
      setLoading(true);
      setError(null);
      try {
        const cp = await getCleaningPlan(token, id);

        setHeader(cp.dataset ?? null);

        // Colonnes éditables
        const seeded: ColumnPlan[] = (cp.columns ?? []).map((c) => ({
          name: c.name,
          new_name: c.name,
          target_type: dtypeToTarget(c.dtype),
          drop: false,
          imputation: undefined,
        }));
        setRows(seeded);

        // Métadonnées
        const meta: Record<string, ColumnMeta> = {};
        (cp.columns ?? []).forEach((c) => {
          const col = c as CleaningColumnExtended;
          meta[col.name] = {
            values: Array.isArray(col.values) ? col.values : undefined,
            stats: col.stats,
            counts: {
              nulls: typeof col.nulls === "number" ? col.nulls : 0,
              distinct:
                typeof col.distinct === "number" ? col.distinct : undefined,
            },
          };
        });
        setColMeta(meta);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Impossible de charger le plan de nettoyage."
        );
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token, id]);

  const hasRows = useMemo(() => rows.length > 0, [rows]);

  /* ------ mises à jour immuables ------ */
  const patchRow = (i: number, patch: Partial<ColumnPlan>) => {
    setRows((prev) => {
      if (i < 0 || i >= prev.length) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const onRename = (i: number, name: string) => patchRow(i, { new_name: name });

  const onType = (i: number, t: ColumnPlan["target_type"]) => {
    const current = rows[i];
    let imp = current.imputation;
    const numericOnly: ReadonlyArray<ColumnImputation["method"]> = [
      "numeric_median",
      "numeric_mean",
      "random_range",
    ];
    if (
      (t === "string" || t === "boolean") &&
      imp &&
      numericOnly.includes(imp.method)
    ) {
      imp = undefined;
    }
    patchRow(i, { target_type: t, imputation: imp });
  };

  const onDrop = (i: number) => patchRow(i, { drop: !rows[i].drop });

  const onImputeMethod = (i: number, m: ColumnImputation["method"] | "") => {
    if (!m) {
      patchRow(i, { imputation: undefined });
      return;
    }
    let imp: ColumnImputation;
    switch (m) {
      case "drop_row":
      case "random_from_existing":
      case "categorical_mode":
      case "numeric_median":
      case "numeric_mean":
        imp = { method: m };
        break;
      case "random_range":
        imp = { method: "random_range", range: [0, 1] };
        break;
      case "constant":
      case "choose_value":
        imp = { method: m, value: "" };
        break;
      default:
        return;
    }
    patchRow(i, { imputation: imp });
  };

  const onImputeValue = (i: number, val: string) => {
    const col = rows[i];
    if (!col?.imputation) return;

    if (col.imputation.method === "random_range") {
      const parts = val.split(",").map((s) => Number(s.trim()));
      if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
        patchRow(i, {
          imputation: { method: "random_range", range: [parts[0], parts[1]] },
        });
      }
      return;
    }

    if (
      col.imputation.method === "constant" ||
      col.imputation.method === "choose_value"
    ) {
      patchRow(i, {
        imputation: { method: col.imputation.method, value: val },
      });
    }
  };

  /* ------ actions ------ */

  const onSave = async () => {
    if (!token || !id) return;
    setSaving(true);
    setError(null);
    try {
      const { saved } = await saveCleaningPlan(token, id, rows);
      alert(saved ? "Plan enregistré ✅" : "Enregistrement effectué.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  /** Suggestions locales simples */
  const onApplySuggestions = () => {
    setRows((prev) =>
      prev.map((col) => {
        const meta = colMeta[col.name];
        const nulls = meta?.counts.nulls ?? 0;
        if (!nulls) return { ...col, imputation: undefined };
        if (col.target_type === "int" || col.target_type === "double") {
          return { ...col, imputation: { method: "numeric_median" } };
        }
        return { ...col, imputation: { method: "categorical_mode" } };
      })
    );
    alert("Suggestions appliquées ✅");
  };

  /* ------ rendu ------ */
  if (loading) {
    return (
      <div className={styles.wrap}>
        <h2 className={styles.title}>Suggestions de nettoyage</h2>
        <div className={styles.card}>Chargement…</div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {header && (
        <div className={styles.banner}>
          <div>
            <span className={styles.k}>Nom</span>
            <span className={styles.v}>{header.name || header.filename}</span>
          </div>
          <div>
            <span className={styles.k}>Fichier</span>
            <span className={styles.v}>{header.filename}</span>
          </div>
          <div>
            <span className={styles.k}>Étape</span>
            <span className={`${styles.badge} ${styles[stepClass()]}`}>
              {stepLabel[header.step]}
            </span>
          </div>
          <div>
            <span className={styles.k}>Statut</span>
            <span
              className={`${styles.badge} ${
                styles[statusClass(header.status)]
              }`}
            >
              {statusLabel[header.status]}
            </span>
          </div>
          <div>
            <span className={styles.k}>Longueur</span>
            <span className={styles.v}>{header.row_count ?? "—"}</span>
          </div>
          <div>
            <span className={styles.k}># Colonnes</span>
            <span className={styles.v}>
              {header.column_count ?? rows.length}
            </span>
          </div>
        </div>
      )}

      <div className={styles.headerRow}>
        <h2 className={styles.title}>Suggestions de nettoyage</h2>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={() => navigate(-1)}>
            ← Retour
          </button>
          <button
            className={styles.secondary}
            onClick={onApplySuggestions}
            disabled={saving}
          >
            Appliquer les suggestions
          </button>
          <button className={styles.primary} onClick={onSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer mon plan"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!hasRows ? (
        <div className={styles.card}>
          Aucune colonne détectée. Vérifie que l’analyse préliminaire a bien
          abouti.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "24%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Colonne</th>
                <th>Type</th>
                <th>Imputation (valeurs manquantes)</th>
                <th>Option</th>
                <th>Stats (distinct / nulls)</th>
                <th>Supprimer la colonne</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((col, idx) => {
                const opts = imputeOptionsFor(col.target_type);
                const meta = colMeta[col.name];
                const distinct =
                  typeof meta?.counts.distinct === "number"
                    ? meta.counts.distinct
                    : "—";
                const nullsCount =
                  typeof meta?.counts.nulls === "number"
                    ? meta.counts.nulls > 0
                      ? meta.counts.nulls
                      : "—"
                    : "—";
                const placeholderRange =
                  meta?.stats &&
                  (meta.stats.min !== undefined || meta.stats.max !== undefined)
                    ? `${meta.stats.min ?? ""},${meta.stats.max ?? ""}`
                    : "min,max";

                return (
                  <tr key={`${col.name}-${idx}`}>
                    <td className={styles.leftCell}>
                      <div className={styles.colCell}>
                        <input
                          className={styles.input}
                          value={col.new_name}
                          onChange={(e) => onRename(idx, e.target.value)}
                        />
                      </div>
                    </td>

                    <td>
                      <select
                        className={styles.select}
                        value={col.target_type}
                        onChange={(e) =>
                          onType(
                            idx,
                            e.target.value as ColumnPlan["target_type"]
                          )
                        }
                      >
                        {TARGET_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={styles.select}
                        value={col.imputation?.method ?? ""}
                        onChange={(e) =>
                          onImputeMethod(
                            idx,
                            (e.target.value as ColumnImputation["method"]) || ""
                          )
                        }
                      >
                        <option value="">— (aucune)</option>
                        {opts.map((m) => (
                          <option key={m} value={m}>
                            {IMP_LABELS[m]}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <div className={styles.optionGroup}>
                        {col.imputation?.method === "random_range" && (
                          <input
                            className={`${styles.input} ${styles.smallInput}`}
                            placeholder={placeholderRange}
                            onChange={(e) => onImputeValue(idx, e.target.value)}
                          />
                        )}
                        {(col.imputation?.method === "constant" ||
                          col.imputation?.method === "choose_value") && (
                          <>
                            {col.imputation.method === "choose_value" ? (
                              <select
                                className={`${styles.select} ${styles.smallInput}`}
                                value={
                                  col.imputation.value !== undefined
                                    ? String(col.imputation.value)
                                    : ""
                                }
                                onChange={(e) =>
                                  onImputeValue(idx, e.target.value)
                                }
                              >
                                <option value="">— choisir —</option>
                                {(meta?.values ?? []).map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className={`${styles.input} ${styles.smallInput}`}
                                placeholder="Valeur"
                                value={
                                  col.imputation?.value !== undefined
                                    ? String(col.imputation.value)
                                    : ""
                                }
                                onChange={(e) =>
                                  onImputeValue(idx, e.target.value)
                                }
                              />
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    <td className={styles.center}>
                      <span className={styles.mono}>{distinct}</span>
                      <span className={styles.sep}> / </span>
                      <span className={styles.mono}>{nullsCount}</span>
                    </td>

                    <td className={styles.toggleCell}>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={col.drop}
                          onChange={() => onDrop(idx)}
                        />
                        <span className={styles.slider} />
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
