/**
 * Standalone Node.js concurrent load testing script
 * Simulates 50 concurrent requests against EVspark API endpoints.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });
dotenv.config();

let API_BASE = process.env.API_URL || "";
const CONCURRENCY = 50;

async function runBenchmark() {
  let server: any = null;
  if (!API_BASE) {
    const { app } = await import("../../apps/api/src/index");
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        API_BASE = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  }

  console.log(`Starting load benchmark with ${CONCURRENCY} concurrent requests against ${API_BASE}...`);

  const lat = 18.5204;
  const lng = 73.8567;

  // Warmup cache
  try {
    await fetch(`${API_BASE}/api/stations/nearby?lat=${lat}&lng=${lng}&radius=25000`);
  } catch {}

  const times: number[] = [];
  const errors: number[] = [];

  const requests = Array.from({ length: CONCURRENCY }).map(async (_, idx) => {
    const start = performance.now();
    try {
      const url = idx % 2 === 0
        ? `${API_BASE}/api/stations/nearby?lat=${lat}&lng=${lng}&radius=25000`
        : `${API_BASE}/api/recommend`;

      const options: RequestInit = idx % 2 === 0
        ? { method: "GET" }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng, connector: "CCS2", radiusKm: 25 }),
          };

      const res = await fetch(url, options);
      const elapsed = performance.now() - start;
      times.push(elapsed);
      if (!res.ok) errors.push(res.status);
    } catch (err: any) {
      errors.push(500);
    }
  });

  await Promise.all(requests);

  if (server) {
    server.close();
  }

  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const max = times[times.length - 1] || 0;

  console.log("\n================ LOAD TEST RESULTS ================");
  console.log(`  Total Requests:  ${CONCURRENCY}`);
  console.log(`  Failed Requests: ${errors.length}`);
  console.log(`  P50 Latency:     ${p50.toFixed(1)} ms`);
  console.log(`  P95 Latency:     ${p95.toFixed(1)} ms  (Target: < 200 ms)`);
  console.log(`  Max Latency:     ${max.toFixed(1)} ms`);
  console.log("====================================================\n");
}

if (process.argv[1]?.includes("run-load")) {
  runBenchmark().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { runBenchmark };
