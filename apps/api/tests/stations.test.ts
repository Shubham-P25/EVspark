import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Stations API Integration Tests", () => {
  let sampleStationId: string = "";

  it("GET /api/stations returns 200 and list of approved stations", async () => {
    const res = await request(app).get("/api/stations");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const station = res.body[0];
    expect(station).toHaveProperty("id");
    expect(station).toHaveProperty("name");
    expect(station).toHaveProperty("lat");
    expect(station).toHaveProperty("lng");
    expect(station).toHaveProperty("chargers");

    sampleStationId = station.id;
  });

  it("GET /api/stations/nearby returns 200 sorted stations around coordinates", async () => {
    const res = await request(app).get("/api/stations/nearby?lat=18.5204&lng=73.8567&radius=30");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty("distanceKm");
    }
  });

  it("GET /api/stations/:id returns 200 and station details with chargers", async () => {
    expect(sampleStationId).toBeTruthy();
    const res = await request(app).get(`/api/stations/${sampleStationId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(sampleStationId);
    expect(res.body).toHaveProperty("chargers");
  });

  it("GET /api/stations/:id returns 404 for non-existent station", async () => {
    const res = await request(app).get("/api/stations/claaaaaaaaaaaaaaaaaaaaaaa");
    expect(res.status).toBe(404);
  });

  it("GET /api/public/stats returns network metrics", async () => {
    const res = await request(app).get("/api/public/stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stations");
    expect(res.body).toHaveProperty("chargersOnline");
    expect(res.body).toHaveProperty("sessionsToday");
    expect(res.body).toHaveProperty("kWhToday");
    expect(res.body).toHaveProperty("simulated");
  });
});
