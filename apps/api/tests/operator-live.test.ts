import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import prisma from "../src/lib/prisma";
import { setupTestAuth, createTestToken } from "./helpers/test-auth";

describe("Operator Live Endpoint Integration Tests", () => {
  let stationId = "";
  let opToken = "";
  let otherOpToken = "";
  let adminToken = "";

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = "admin@evspark.in";
    await setupTestAuth();

    // Create the test operator user in DB
    const opUser = await prisma.user.upsert({
      where: { authId: "op-live-auth-user" },
      create: {
        authId: "op-live-auth-user",
        email: "op.live@evspark.in",
        role: "OPERATOR",
        name: "Station Owner",
      },
      update: { role: "OPERATOR" },
    });

    const otherUser = await prisma.user.upsert({
      where: { authId: "op-live-other-user" },
      create: {
        authId: "op-live-other-user",
        email: "op.other@evspark.in",
        role: "OPERATOR",
        name: "Other Operator",
      },
      update: { role: "OPERATOR" },
    });

    opToken = await createTestToken({
      sub: "op-live-auth-user",
      email: "op.live@evspark.in",
      role: "OPERATOR",
      name: "Station Owner",
    });

    otherOpToken = await createTestToken({
      sub: "op-live-other-user",
      email: "op.other@evspark.in",
      role: "OPERATOR",
      name: "Other Operator",
    });

    adminToken = await createTestToken({
      sub: "admin-auth-id",
      email: "admin@evspark.in",
      name: "Root Admin",
    });

    // Ensure a test station owned by opUser.id
    const station = await prisma.station.findFirst({
      include: { chargers: true },
    });

    if (station) {
      await prisma.station.update({
        where: { id: station.id },
        data: { operatorUserId: opUser.id },
      });
      stationId = station.id;
    }
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get(`/api/operator/stations/${stationId}/live`);
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as a different operator", async () => {
    const res = await request(app)
      .get(`/api/operator/stations/${stationId}/live`)
      .set("Authorization", `Bearer ${otherOpToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 200 with station, chargers, queue, kpis, recentEvents for the station owner", async () => {
    const res = await request(app)
      .get(`/api/operator/stations/${stationId}/live`)
      .set("Authorization", `Bearer ${opToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("station");
    expect(res.body.station.id).toBe(stationId);
    expect(res.body).toHaveProperty("chargers");
    expect(Array.isArray(res.body.chargers)).toBe(true);
    expect(res.body).toHaveProperty("queue");
    expect(res.body).toHaveProperty("kpis");
    expect(res.body.kpis).toHaveProperty("revenueToday");
    expect(res.body.kpis).toHaveProperty("completedRevenueToday");
    expect(res.body.kpis).toHaveProperty("energyTodayKwh");
    expect(res.body.kpis).toHaveProperty("completedKwhToday");
    expect(res.body.kpis).toHaveProperty("sessionsToday");
    expect(res.body).toHaveProperty("recentEvents");
  });

  it("returns 200 when accessed by an ADMIN", async () => {
    const res = await request(app)
      .get(`/api/operator/stations/${stationId}/live`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.station.id).toBe(stationId);
  });
});
