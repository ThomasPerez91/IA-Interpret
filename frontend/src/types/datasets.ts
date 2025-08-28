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

export type SchemaField = {
  name: string;
  dtype: string;
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
  status: (typeof DatasetStatus)[keyof typeof DatasetStatus];
  step: (typeof DatasetStep)[keyof typeof DatasetStep];
  progress: number; // 0..100
  error_message?: string | null;
  updated_at?: string;
};

export type DatasetListResponse = {
  items: DatasetInfo[];
};

export type UploadResponse = {
  dataset_id: string;
  status: (typeof DatasetStatus)[keyof typeof DatasetStatus]; // ou string si tu préfères
  message: string;
};
