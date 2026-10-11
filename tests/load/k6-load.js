import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "10s", target: 20 },  // ramp up to 20 VUs
    { duration: "30s", target: 50 },  // stay at 50 VUs
    { duration: "10s", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<200"], // 95% of requests must complete below 200ms
    http_req_failed: ["rate<0.01"],   // less than 1% errors
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:4000";

export default function () {
  // 1. Query nearby stations
  const nearbyRes = http.get(
    `${BASE_URL}/api/stations/nearby?lat=18.5204&lng=73.8567&radius=25`,
    { headers: { Accept: "application/json" } }
  );
  check(nearbyRes, {
    "nearby status is 200": (r) => r.status === 200,
    "nearby returns array": (r) => JSON.parse(r.body).length > 0,
  });

  sleep(0.5);

  // 2. Query AI recommendation
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
    "recommend has top station": (r) => JSON.parse(r.body).recommended !== undefined,
  });

  sleep(1);
}
