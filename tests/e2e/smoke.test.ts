import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "apps/api/.env") });

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../apps/api/src/index";
import { setupTestAuth, createTestToken } from "../../apps/api/tests/helpers/test-auth";

describe("E2E Driver Flow Smoke Test", () => {
  let driverToken: string = "";
  let selectedStationId: string = "";

  beforeAll(async () => {
    await setupTestAuth();
    driverToken = await createTestToken({
      sub: "smoke-test-driver-99",
      email: "smoke.driver@evspark.in",
      name: "Rohan SmokeTester",
    });
  });

  it("Step 1: Authenticate driver and verify profile access", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("smoke.driver@evspark.in");
    expect(res.body.role).toBe("DRIVER");
  });

  it("Step 2: Find nearby charging stations around Pune/Mumbai", async () => {
    const res = await request(app)
      .get("/api/stations/nearby?lat=18.5204&lng=73.8567&radius=35000");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("distanceKm");
  });

  it("Step 3: Request AI station recommendation", async () => {
    const res = await request(app)
      .post("/api/recommend")
      .send({
        lat: 18.5204,
        lng: 73.8567,
        connector: "CCS2",
        radiusKm: 35,
      });

    expect(res.status).toBe(200);
    expect(res.body.recommended).toBeDefined();
    expect(res.body.recommended).toHaveProperty("stationId");
    expect(res.body.recommended).toHaveProperty("score");
    expect(res.body.recommended).toHaveProperty("waitTimeMin");

    selectedStationId = res.body.recommended.stationId;
  });

  it("Step 4: Join virtual queue for recommended station", async () => {
    expect(selectedStationId).toBeTruthy();

    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        stationId: selectedStationId,
        connector: "CCS2",
        etaMinutes: 15,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("queuePosition");
    expect(res.body.queuePosition).toBeGreaterThan(0);
  });

  it("Step 5: Verify position in station virtual queue", async () => {
    const res = await request(app)
      .get(`/api/queue/station/${selectedStationId}`);

    expect(res.status).toBe(200);
    expect(res.body.stationId).toBe(selectedStationId);
    expect(res.body.count).toBeGreaterThan(0);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it("Step 6: Reserve guaranteed slot at station", async () => {
    const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${driverToken}`)
      .send({
        stationId: selectedStationId,
        startTime,
        durationMin: 30,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("CONFIRMED");
  });
});
