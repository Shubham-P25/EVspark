import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/index";

describe("Pins API Integration Tests", () => {
  it("GET /api/stations/pins with invalid z returns 400", async () => {
    const res = await request(app).get("/api/stations/pins?z=8&x=100&y=100");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("GET /api/stations/pins with empty ocean tile returns []", async () => {
    const res = await request(app).get("/api/stations/pins?z=12&x=0&y=0");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
    expect(res.headers["cache-control"]).toContain("max-age=10");
    expect(res.headers.etag).toBeDefined();
  });

  it("GET /api/stations/pins returns 304 on matching ETag", async () => {
    const initialRes = await request(app).get("/api/stations/pins?z=12&x=0&y=0");
    expect(initialRes.status).toBe(200);
    const etag = initialRes.headers.etag;
    expect(etag).toBeDefined();

    const notModifiedRes = await request(app)
      .get("/api/stations/pins?z=12&x=0&y=0")
      .set("If-None-Match", etag);
    expect(notModifiedRes.status).toBe(304);
  });

  it("GET /api/stations/pins for valid tile returns compact tuples", async () => {
    // Mumbai region tile at z=12
    const res = await request(app).get("/api/stations/pins?z=12&x=2877&y=1826");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    if (res.body.length > 0) {
      const tuple = res.body[0];
      // Format: [id, lat, lng, free, usable, total, maxKw, source, updatedAtSec]
      expect(Array.isArray(tuple)).toBe(true);
      expect(tuple.length).toBe(9);
      expect(typeof tuple[0]).toBe("string"); // id
      expect(typeof tuple[1]).toBe("number"); // lat
      expect(typeof tuple[2]).toBe("number"); // lng
      expect(typeof tuple[3]).toBe("number"); // free
      expect(typeof tuple[4]).toBe("number"); // usable
      expect(typeof tuple[5]).toBe("number"); // total
      expect(typeof tuple[6]).toBe("number"); // maxKw
      expect([0, 1, 2]).toContain(tuple[7]); // source: google=0, twin=1, none=2
      expect(typeof tuple[8]).toBe("number"); // updatedAtSec
    }
  });
});
