import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Journeys API Integration Tests", () => {
  it("POST /api/journeys/plan calculates optimal route and charging stops", async () => {
    const res = await request(app)
      .post("/api/journeys/plan")
      .send({
        from: { lat: 18.5204, lng: 73.8567 }, // Pune
        to: { lat: 19.0760, lng: 72.8777 },   // Mumbai
        rangeKm: 250,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("summary");
    expect(res.body.summary).toHaveProperty("totalDistanceKm");
    expect(res.body.summary).toHaveProperty("estimatedDriveMin");
    expect(res.body).toHaveProperty("stops");
    expect(Array.isArray(res.body.stops)).toBe(true);
    expect(res.body).toHaveProperty("routePolyline");
  });
});
