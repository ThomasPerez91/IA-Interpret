/* =========================================
 * Dataset: statuts / étapes
 * ======================================= */

export const DatasetStatus = {
  QUEUED: "queued",
  UPLOADING: "uploading_hdfs",
  ANALYZING: "analyzing",
  DONE: "done",
  FAILED: "failed",
} as const;
export type DatasetStatus = (typeof DatasetStatus)[keyof typeof DatasetStatus];

export const DatasetStep = {
  INITIAL_ANALYSIS: "initial_analysis",
} as const;
export type DatasetStep = (typeof DatasetStep)[keyof typeof DatasetStep];

/* =========================================
 * Schéma & analyse initiale
 * ======================================= */

export type SchemaField = {
  name: string;
  dtype: string;
  /** compat: parfois "type" est utilisé au lieu de "dtype" */
  type?: string;
};

export type DatasetAnalysis = {
  dataset_id: string; // ObjectId string
  user_id: string; // ObjectId string
  generated_at: string; // ISO
  hdfs_path: string;

  row_count: number;
  column_count: number;

  schema: SchemaField[];

  null_counts: Record<string, number>;
  bad_type_counts?: Record<string, number>;
  distinct_counts?: Record<string, number>;
  constant_columns?: string[];
  suggestions?: string[];
};

/* =========================================
 * DTOs de liste & détail
 * ======================================= */

export type DatasetInfo = {
  id: string;
  /** nom d’affichage: custom_name || filename */
  name: string;
  filename: string;
  custom_name?: string | null;

  row_count: number | null;
  column_count: number | null;

  step: DatasetStep;
  status: DatasetStatus;

  created_at?: string;
};

export type DatasetDetail = {
  id: string;
  name: string;
  filename: string;
  custom_name?: string | null;

  status: DatasetStatus;
  step: DatasetStep;

  row_count: number | null;
  column_count: number | null;

  hdfs_path: string | null;
  error_message: string | null;

  created_at?: string;
  updated_at?: string;

  analysis?: DatasetAnalysis;
};

export type StatusResponse = {
  dataset_id: string;
  status: DatasetStatus;
  step: DatasetStep;
  progress: number; // 0..100
  error_message?: string | null;
  updated_at?: string;
};

export type DatasetListResponse = {
  items: DatasetInfo[];
};

export type UploadResponse = {
  dataset_id: string;
  status: DatasetStatus;
  message: string;
};

/* =========================================
 * Cleaning plan – types FRONT
 * (ce que tu utilises dans l’UI)
 * ======================================= */

/**
 * Méthodes d’imputation (frontend).
 * On inclut aussi quelques alias pour être tolérant:
 *  - numeric_median / median, numeric_mean / mean, etc.
 *  - random_range (avec range explicite)
 *  - constant / choose_value / value (avec "value")
 */
export type ColumnImputation =
  | { method: "drop_row" }
  | { method: "random_from_existing" }
  | { method: "categorical_mode" }
  | { method: "numeric_median" }
  | { method: "numeric_mean" }
  | { method: "median" }
  | { method: "mean" }
  | { method: "mode" }
  | { method: "min" }
  | { method: "max" }
  | { method: "random_range"; range: [number, number] }
  | { method: "random_between_min_max" }
  | { method: "constant"; value: string | number }
  | { method: "choose_value"; value: string | number }
  | { method: "value"; value: string | number };

/**
 * Plan d’une colonne pour l’UI de nettoyage.
 * - `new_name` : renommage éventuel
 * - `target_type` : type souhaité après nettoyage
 */
export type ColumnPlan = {
  name: string; // nom original
  new_name: string; // nom choisi (peut = name)
  target_type: "string" | "int" | "double" | "boolean";
  drop: boolean;
  imputation?: ColumnImputation;
};

/**
 * Réponse détaillée affichée par la page de nettoyage:
 * - infos dataset condensées
 * - résumé colonne par colonne (dtype détecté, #nulls, suggestions)
 */
export type CleaningPlanResponse = {
  dataset: {
    id: string;
    name: string;
    filename: string;
    step: DatasetStep;
    status: DatasetStatus;
    row_count: number | null;
    column_count: number | null;
  };
  columns: Array<{
    name: string;
    dtype: string;
    nulls: number;
    suggestions?: Array<
      { action: "drop" } | { action: "impute"; value: string }
    >;
  }>;
};

/* =========================================
 * Cleaning plan – types BACKEND (compat)
 * Si ton backend attend { rename_to, dtype } et un autre vocabulaire
 * d’imputation, on expose aussi ces types pour sérialiser proprement.
 * ======================================= */

export type BackendImputation =
  | { method: "drop_row" | "random_from_existing" | "mode" }
  | { method: "median" | "mean" | "min" | "max" }
  | { method: "random_between_min_max" }
  | { method: "value"; value: string | number };

export type BackendColumnPlan = {
  name: string;
  rename_to: string;
  dtype: "string" | "int" | "double" | "boolean";
  drop: boolean;
  imputation?: BackendImputation | null;
};

export type BackendCleaningPlanPayload = {
  dataset_id: string;
  columns: BackendColumnPlan[];
};

export type BackendCleaningPlanSaveResult = {
  ok: boolean;
};
