import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { setupTestAuth, createTestToken } from "./helpers/test-auth";

describe("Auth Integration Tests", () => {
  beforeAll(async () => {
    await setupTestAuth();
  });

  it("returns 401 on protected endpoint without token", async () => {
    const res = await request(app).get("/api/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 401 on invalid token", async () => {
    const res = await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer invalid-jwt-token");
    expect(res.status).toBe(401);
  });

  it("authenticates valid driver token and upserts user on /api/me", async () => {
    const token = await createTestToken({
      sub: "driver-auth-001",
      email: "driver.test@evspark.in",
      name: "Aarav Driver",
    });

    const res = await request(app)
      .get("/api/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("driver.test@evspark.in");
    expect(res.body.role).toBe("DRIVER");
  });
});
