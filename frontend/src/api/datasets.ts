import type {
  DatasetListResponse,
  UploadResponse,
  StatusResponse,
  DatasetDetail,
} from "../types/datasets";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

export async function listDatasets(
  token: string
): Promise<DatasetListResponse> {
  const res = await fetch(`${API_URL}/datasets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`listDatasets failed: ${res.status}`);
  return res.json();
}

export async function uploadDataset(
  token: string,
  file: File,
  datasetName?: string
): Promise<UploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  if (datasetName) fd.append("dataset_name", datasetName);

  const res = await fetch(`${API_URL}/datasets/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDatasetStatus(
  token: string,
  datasetId: string
): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/datasets/${datasetId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`getDatasetStatus failed: ${res.status}`);
  return res.json();
}

export async function getDatasetDetail(
  token: string,
  datasetId: string
): Promise<DatasetDetail> {
  const res = await fetch(`${API_URL}/datasets/${datasetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`getDatasetDetail failed: ${res.status}`);
  return res.json();
}

export async function deleteDataset(
  token: string,
  datasetId: string
): Promise<{ archived: boolean }> {
  const res = await fetch(`${API_URL}/datasets/${datasetId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`deleteDataset failed: ${res.status}`);
  return res.json();
}
