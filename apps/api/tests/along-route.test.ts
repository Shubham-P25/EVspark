import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Along-Route, Detail Enrichment, and Photos Tests", () => {
  let stationId = "";

  it("fetches a valid station id first", async () => {
    const res = await request(app).get("/api/stations?limit=1");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    stationId = res.body[0].id;
  });

  it("GET /api/stations/:id returns enriched details (ratingBreakdown, queueLength, chargers)", async () => {
    const res = await request(app).get(`/api/stations/${stationId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("queueLength");
    expect(res.body).toHaveProperty("ratingAvg");
    expect(res.body).toHaveProperty("ratingCount");
    expect(res.body).toHaveProperty("ratingBreakdown");
    expect(Array.isArray(res.body.chargers)).toBe(true);
    if (res.body.chargers.length > 0) {
      expect(res.body.chargers[0]).toHaveProperty("activeSession");
    }
  });

  it("GET /api/stations/:id/reviews returns 200 and list of reviews", async () => {
    const res = await request(app).get(`/api/stations/${stationId}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("reviews");
    expect(Array.isArray(res.body.reviews)).toBe(true);
  });

  it("GET /api/stations/:id/photos returns 200 and photos object", async () => {
    const res = await request(app).get(`/api/stations/${stationId}/photos`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("photos");
    expect(res.body).toHaveProperty("attributions");
    expect(Array.isArray(res.body.photos)).toBe(true);
  });

  it("POST /api/stations/along-route validates input schema", async () => {
    const badRes = await request(app)
      .post("/api/stations/along-route")
      .send({ polyline: "a" }); // too short
    expect(badRes.status).toBe(400);
  });

  it("POST /api/stations/along-route returns stations along route with distanceAlongRouteKm and detourKm", async () => {
    // Encoded polyline for line through Pune: (18.5204, 73.8567) -> (18.5300, 73.8600)
    // Encoded string: "sptkAkd|uMuIqI"
    const polyline = "sptkAkd|uMuIqI";
    const res = await request(app)
      .post("/api/stations/along-route")
      .send({
        polyline,
        radiusM: 5000,
        limit: 10,
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const st = res.body[0];
      expect(st).toHaveProperty("distanceAlongRouteKm");
      expect(st).toHaveProperty("detourKm");
      expect(st.detourKm).toBeLessThanOrEqual(5.0);
    }
  });
});
