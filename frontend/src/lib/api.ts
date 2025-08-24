const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5001";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  opts: {
    method?: HttpMethod;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}
