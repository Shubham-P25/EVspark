import { useAuthStore } from "./auth-store";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.warn("[API] 401 Unauthorized for:", endpoint);
    // Auto-logout if token expired
    if (token) {
      useAuthStore.getState().logout();
    }
  }

  if (!response.ok) {
    let errData: any;
    try {
      errData = await response.json();
    } catch {
      errData = { message: response.statusText };
    }
    throw new ApiError(response.status, errData?.error?.message || errData?.message || `HTTP ${response.status}`, errData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T = any>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T = any>(path: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T = any>(path: string, body?: any, options?: RequestInit) =>
    apiFetch<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T = any>(path: string, options?: RequestInit) => apiFetch<T>(path, { ...options, method: "DELETE" }),
};