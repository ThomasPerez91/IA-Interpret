import type {
  CleaningPlanResponse,
  ColumnPlan,
  ColumnImputation,
} from "../types/datasets";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

/** GET /cleaning/:id/plan */
export async function getCleaningPlan(
  token: string,
  datasetId: string
): Promise<CleaningPlanResponse> {
  const res = await fetch(`${API_URL}/cleaning/${datasetId}/plan`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`getCleaningPlan failed: ${res.status}`);
  }
  return res.json();
}

/* ---------------- Backend mapping helpers ---------------- */

/** Map le type cible UI -> dtype attendu côté backend */
function toBackendDtype(
  target: ColumnPlan["target_type"]
): "string" | "int" | "double" | "boolean" {
  switch (target) {
    case "int":
      return "int";
    case "double":
      return "double";
    case "boolean":
      return "boolean";
    default:
      return "string";
  }
}

/** Méthodes acceptées côté backend (cleaning_controller.ImputeMethod) */
type BackendImputeMethod =
  | "drop_row"
  | "random_from_existing"
  | "median"
  | "mean"
  | "mode"
  | "value"
  | "min"
  | "max"
  | "random_between_min_max";

/** Map imputation UI -> imputation backend (méthodes + payload) */
function toBackendImputation(
  imp: ColumnImputation | undefined
): { method: BackendImputeMethod; value?: number | string } | null {
  if (!imp) return null;

  switch (imp.method) {
    // UI: numeric_median -> BE: median
    case "numeric_median":
      return { method: "median" };
    // UI: numeric_mean   -> BE: mean
    case "numeric_mean":
      return { method: "mean" };
    // UI: random_range   -> BE: random_between_min_max (on passe "min,max" en string si possible)
    case "random_range": {
      const [min, max] = imp.range ?? [undefined, undefined];
      if (typeof min === "number" && typeof max === "number") {
        return { method: "random_between_min_max", value: `${min},${max}` };
      }
      return { method: "random_between_min_max" };
    }
    // UI: categorical_mode -> BE: mode
    case "categorical_mode":
      return { method: "mode" };

    // UI: constant/choose_value -> BE: value
    case "constant":
    case "choose_value":
      return { method: "value", value: imp.value ?? "" };

    // identiques
    case "drop_row":
    case "random_from_existing":
      return { method: imp.method };

    default:
      return null;
  }
}

/* ---------------- API ---------------- */

/** POST /cleaning/:id/plan — envoie { dataset_id, columns[...] } au format backend */
export async function saveCleaningPlan(
  token: string,
  datasetId: string,
  columns: ColumnPlan[]
): Promise<{ saved: boolean }> {
  const body = {
    dataset_id: datasetId,
    columns: (columns ?? []).map((c) => ({
      name: c.name,
      rename_to: c.new_name || c.name,
      dtype: toBackendDtype(c.target_type),
      drop: !!c.drop,
      imputation: toBackendImputation(c.imputation) ?? null,
    })),
  };

  const res = await fetch(`${API_URL}/cleaning/${datasetId}/plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`saveCleaningPlan failed: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { ok?: boolean };
  return { saved: !!json?.ok };
}
