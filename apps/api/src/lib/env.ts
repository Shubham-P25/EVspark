export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  const missing: string[] = [];
  for (const k of ["DATABASE_URL", "REDIS_URL", "TWIN_SECRET", "CLERK_JWKS_URL"]) {
    if (!process.env[k]) missing.push(k);
  }
  const twin = process.env.TWIN_SECRET || "";
  if (twin === "dev-twin-secret" || (twin && twin.length < 16)) missing.push("TWIN_SECRET (too weak / default)");
  if (process.env.DEMO_MODE === "true") console.warn("[env] DEMO_MODE=true in production: simulated data will be shown");
  if (missing.length) {
    throw new Error(`Missing/invalid environment variables: ${missing.join(", ")}`);
  }
}
