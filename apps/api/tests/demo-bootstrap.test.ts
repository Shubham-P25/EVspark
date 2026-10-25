import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Demo Bootstrap API Tests", () => {
  it("GET /api/demo/bootstrap returns 400 on missing or invalid lat/lng", async () => {
    const res = await request(app).get("/api/demo/bootstrap");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it(
    "GET /api/demo/bootstrap returns 200 with geofences, clearances, and routes",
    async () => {
      // Thane coordinates where stations exist
      const res = await request(app).get("/api/demo/bootstrap?lat=19.2183&lng=72.9781&limit=2");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stations");
    expect(Array.isArray(res.body.stations)).toBe(true);
    expect(res.body.stations.length).toBeGreaterThan(0);

    const first = res.body.stations[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("fence");
    expect(first).toHaveProperty("routes");

    // Geofence rules: radius must never hit road (radius <= clearance - 7)
    expect(first.fence.radiusM).toBeLessThanOrEqual(first.fence.clearanceM - 7);
    expect(first.fence.radiusM).toBeGreaterThanOrEqual(8);
    expect(first.fence.radiusM).toBeLessThanOrEqual(45);
    expect(Array.isArray(first.routes)).toBe(true);
  }, 25000);
});
