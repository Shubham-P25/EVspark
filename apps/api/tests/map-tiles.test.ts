import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Map Tiles and Live Layer API Tests", () => {
  it("GET /api/stations/tiles/:z/:x/:y returns 400 on invalid tile coordinates", async () => {
    // Zoom must be 11 per schema
    const res = await request(app).get("/api/stations/tiles/5/10/10");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/stations/tiles/:z/:x/:y returns 200 with columnar JSON format", async () => {
    // Tile for Mumbai/Thane region at z=11
    const res = await request(app).get("/api/stations/tiles/11/1439/893");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("v", 1);
    expect(res.body).toHaveProperty("n");
    expect(res.body).toHaveProperty("ids");
    expect(res.body).toHaveProperty("lat");
    expect(res.body).toHaveProperty("lng");
    expect(res.body).toHaveProperty("tot");
    expect(Array.isArray(res.body.ids)).toBe(true);
    expect(res.headers).toHaveProperty("etag");
  });

  it("GET /api/stations/tiles/:z/:x/:y returns 304 Not Modified when ETag matches", async () => {
    const first = await request(app).get("/api/stations/tiles/11/1439/893");
    expect(first.status).toBe(200);
    const etag = first.headers.etag;
    expect(etag).toBeTruthy();

    const second = await request(app)
      .get("/api/stations/tiles/11/1439/893")
      .set("If-None-Match", etag);
    expect(second.status).toBe(304);
  });

  it("GET /api/stations/tiles/:z/:x/:y/live returns 200 and aligns with static IDs", async () => {
    const staticRes = await request(app).get("/api/stations/tiles/11/1439/893");
    expect(staticRes.status).toBe(200);

    const liveRes = await request(app).get("/api/stations/tiles/11/1439/893/live");
    expect(liveRes.status).toBe(200);
    expect(liveRes.body).toHaveProperty("v", 1);
    expect(liveRes.body).toHaveProperty("free");
    expect(liveRes.body).toHaveProperty("wait");
    expect(Array.isArray(liveRes.body.free)).toBe(true);
    expect(Array.isArray(liveRes.body.wait)).toBe(true);

    // Live arrays align with number of static stations
    expect(liveRes.body.free.length).toBe(staticRes.body.ids.length);
    expect(liveRes.body.wait.length).toBe(staticRes.body.ids.length);
  });
});
