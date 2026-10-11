import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Recommend API Integration Tests", () => {
  it("POST /api/recommend returns ranked recommendation with score breakdown", async () => {
    const res = await request(app)
      .post("/api/recommend")
      .send({
        lat: 18.5204,
        lng: 73.8567,
        connector: "CCS2",
        radiusKm: 25,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("recommended");
    expect(res.body.recommended).toHaveProperty("stationId");
    expect(res.body.recommended).toHaveProperty("score");
    expect(res.body.recommended).toHaveProperty("distanceKm");
    expect(res.body.recommended).toHaveProperty("waitTimeMin");
    expect(res.body).toHaveProperty("rankedCandidates");
  });
});
