import { describe, it, expect } from "vitest";
import { mulberry32, chargePowerKw, simulateSession, expectedArrivals, VEHICLES } from "./model";

describe("sim model", () => {
  it("rng is deterministic", () => {
    const a = mulberry32(42), b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("power holds until 80% then tapers", () => {
    const v = VEHICLES[0];
    const p50 = chargePowerKw(60, v, true, 50);
    const p95 = chargePowerKw(60, v, true, 95);
    expect(p50).toBeGreaterThan(p95);
    expect(p95).toBeGreaterThan(0);
  });
  it("session energy and duration are consistent", () => {
    const rng = mulberry32(7);
    const s = simulateSession(rng, { powerKw: 50 }, VEHICLES[0]);
    expect(s.socEnd).toBeGreaterThan(s.socStart);
    expect(s.energyKwh).toBeGreaterThan(0);
    expect(s.energyKwh / (s.durationMin / 60)).toBeLessThanOrEqual(50.5); // never above charger power
  });
  it("evening mall demand is higher than 3am", () => {
    expect(expectedArrivals("mall", 4, 19, 2, 1)).toBeGreaterThan(expectedArrivals("mall", 4, 3, 2, 1) * 10);
  });
});
