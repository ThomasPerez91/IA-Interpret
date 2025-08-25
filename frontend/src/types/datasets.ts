export type DatasetInfo = {
  id: string;
  name: string;
  row_count: number | null;
  column_count: number | null;
  status: "queued" | "uploading_hdfs" | "analyzing" | "done" | "failed";
  created_at?: string;
};

export type DatasetListResponse = {
  items: DatasetInfo[];
};

export type UploadResponse = {
  dataset_id: string;
  status: string;
  message: string;
};

export type StatusResponse = {
  dataset_id: string;
  status: DatasetInfo["status"];
  progress: number; // 0..100
  error_message?: string | null;
  updated_at?: string;
};
