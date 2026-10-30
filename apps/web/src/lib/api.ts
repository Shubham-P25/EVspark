"use client";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;
  fields?: Record<string, string>;

  constructor(message: string, status: number, code?: string, requestId?: string, details?: unknown, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

type TokenGetter = () => Promise<string | null>;
type EmailGetter = () => string | null;

let globalTokenGetter: TokenGetter | null = null;
let globalEmailGetter: EmailGetter | null = null;

export function setTokenGetter(getter: TokenGetter | null) {
  globalTokenGetter = getter;
}

export function setUserEmailGetter(getter: EmailGetter | null) {
  globalEmailGetter = getter;
}

export type ApiOptions = RequestInit & { json?: unknown };

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { json, ...init } = options;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const url = path.startsWith("http")
    ? path
    : `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers || {});
  let body = init.body;
  if (json !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(json);
  } else if (!headers.has("Content-Type") && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (globalTokenGetter && !headers.has("Authorization")) {
    try {
      const token = await globalTokenGetter();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch {
      // Proceed without token if retrieval fails
    }
  }

  if (globalEmailGetter && !headers.has("X-User-Email")) {
    try {
      const email = globalEmailGetter();
      if (email) {
        headers.set("X-User-Email", email);
      }
    } catch {
      // Ignore error
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      body,
      signal: init.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // Not a JSON response
      }

      const message =
        errorData?.error?.message ||
        errorData?.message ||
        `Request failed with status ${response.status}`;
      const code = errorData?.error?.code || errorData?.code;
      const requestId = errorData?.error?.requestId || errorData?.requestId;
      const details = errorData?.error?.details || errorData?.details;

      throw new ApiError(message, response.status, code, requestId, details);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new ApiError("Request timed out after 10 seconds", 408, "TIMEOUT");
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error?.message || "Network request failed", 500, "NETWORK_ERROR");
  }
}

export interface ApiClient {
  <T>(path: string, options?: ApiOptions): Promise<T>;
  get: <T>(path: string, options?: ApiOptions) => Promise<T>;
  post: <T>(path: string, body?: any, options?: ApiOptions) => Promise<T>;
  put: <T>(path: string, body?: any, options?: ApiOptions) => Promise<T>;
  patch: <T>(path: string, body?: any, options?: ApiOptions) => Promise<T>;
  delete: <T>(path: string, options?: ApiOptions) => Promise<T>;
}

export const api: ApiClient = Object.assign(
  function <T>(path: string, options?: ApiOptions): Promise<T> {
    return apiFetch<T>(path, options);
  },
  {
    get: <T>(path: string, options?: ApiOptions) => apiFetch<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: any, options?: ApiOptions) =>
      apiFetch<T>(path, {
        ...options,
        method: "POST",
        body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : body,
      }),
    put: <T>(path: string, body?: any, options?: ApiOptions) =>
      apiFetch<T>(path, {
        ...options,
        method: "PUT",
        body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : body,
      }),
    patch: <T>(path: string, body?: any, options?: ApiOptions) =>
      apiFetch<T>(path, {
        ...options,
        method: "PATCH",
        body: body !== undefined && !(body instanceof FormData) ? JSON.stringify(body) : body,
      }),
    delete: <T>(path: string, options?: ApiOptions) => apiFetch<T>(path, { ...options, method: "DELETE" }),
  }
);


export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(body?.error?.message ?? res.statusText, res.status, body?.error?.code ?? "ERROR", undefined, body?.error?.fields);
    return body as T;
  }, [getToken]);
}

export type Me = {
  id: string; role: "DRIVER" | "OPERATOR" | "ADMIN"; name: string | null; username: string | null; email: string | null;
  onboarded: boolean; onboardingDraft: { step: number; data: Record<string, unknown> } | null;
};

export function useMe() {
  const apiCall = useApi();
  const { isLoaded, isSignedIn } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { const r = await apiCall<{ user: Me }>("/api/me"); setMe(r.user); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [apiCall]);
  useEffect(() => { if (isLoaded && isSignedIn) void refresh(); }, [isLoaded, isSignedIn, refresh]);
  return { me, loading, error, refresh, setMe };
}
