import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { setupTestAuth, createTestToken } from "./helpers/test-auth";

describe("Admin API Integration Tests", () => {
  let adminToken: string = "";
  let driverToken: string = "";

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = "admin@evspark.in";
    await setupTestAuth();

    adminToken = await createTestToken({
      sub: "admin-auth-id",
      email: "admin@evspark.in",
      name: "Root Admin",
    });

    driverToken = await createTestToken({
      sub: "regular-driver-id",
      email: "regular.driver@evspark.in",
      name: "Regular Driver",
    });
  });

  it("non-admin driver receives 403 on /api/admin/sim-config", async () => {
    const res = await request(app)
      .get("/api/admin/sim-config")
      .set("Authorization", `Bearer ${driverToken}`);

    expect(res.status).toBe(403);
  });

  it("admin receives 200 on GET /api/admin/sim-config", async () => {
    const res = await request(app)
      .get("/api/admin/sim-config")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("speed");
    expect(res.body).toHaveProperty("running");
  });

  it("admin can update simulation config via PATCH /api/admin/sim-config", async () => {
    const res = await request(app)
      .patch("/api/admin/sim-config")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        speed: 15,
        arrivalsPerMin: 1.2,
      });

    expect(res.status).toBe(200);
    expect(res.body.speed).toBe(15);
    expect(res.body.arrivalsPerMin).toBe(1.2);
  });
});
