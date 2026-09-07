const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${path}`);
  return response.json() as Promise<T>;
}

export { BASE, DEMO };