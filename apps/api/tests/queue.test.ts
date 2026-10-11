import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { setupTestAuth, createTestToken } from "./helpers/test-auth";

describe("Queue API Integration Tests", () => {
  let stationId: string = "";
  let authToken: string = "";

  beforeAll(async () => {
    await setupTestAuth();
    authToken = await createTestToken({
      sub: "queue-driver-1",
      email: "queue.driver@evspark.in",
    });

    const stationsRes = await request(app).get("/api/stations");
    if (stationsRes.body.length > 0) {
      stationId = stationsRes.body[0].id;
    }
  });

  it("POST /api/queue/join allows joining virtual queue", async () => {
    expect(stationId).toBeTruthy();

    const res = await request(app)
      .post("/api/queue/join")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        stationId,
        connector: "CCS2",
        etaMinutes: 15,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("queuePosition");
    expect(res.body.queuePosition).toBeGreaterThan(0);
    expect(res.body).toHaveProperty("estimatedWaitMin");
  });

  it("joining queue again increments queue position", async () => {
    const res = await request(app)
      .post("/api/queue/join")
      .send({
        stationId,
        connector: "CCS2",
        etaMinutes: 20,
      });

    expect(res.status).toBe(201);
    expect(res.body.queuePosition).toBeGreaterThan(1);
  });
});
