import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "40s", target: 50 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<300"], // p95 < 300 ms
    http_req_failed: ["rate<0.01"],   // error rate < 1 %
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000";

const BBOXES = [
  // Mumbai central
  "72.80,18.90,72.95,19.10",
  // Pune central
  "73.75,18.45,73.95,18.60",
  // Expressway corridor
  "73.00,18.70,73.50,19.00",
];

export default function () {
  const bbox = BBOXES[Math.floor(Math.random() * BBOXES.length)];

  // 1. Station list with bbox (cached fast path)
  const bboxRes = http.get(`${BASE_URL}/api/stations?bbox=${bbox}`, {
    headers: { Accept: "application/json" },
  });
  check(bboxRes, {
    "bbox status is 200": (r) => r.status === 200,
  });

  // 2. Query nearby stations
  const nearbyRes = http.get(
    `${BASE_URL}/api/stations/nearby?lat=18.5204&lng=73.8567&radius=25000`,
    { headers: { Accept: "application/json" } }
  );
  check(nearbyRes, {
    "nearby status is 200": (r) => r.status === 200,
  });

  // 3. Query AI recommendation
  const payload = JSON.stringify({
    lat: 18.5204,
    lng: 73.8567,
    connector: "CCS2",
    radiusKm: 25,
  });
  const recRes = http.post(`${BASE_URL}/api/recommend`, payload, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });
  check(recRes, {
    "recommend status is 200": (r) => r.status === 200,
  });

  sleep(0.5);
}
