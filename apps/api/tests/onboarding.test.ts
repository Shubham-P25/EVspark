import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { setupTestAuth, createTestToken } from "./helpers/test-auth";

describe("Onboarding API Integration Tests", () => {
  beforeAll(async () => {
    await setupTestAuth();
  });

  it("successfully onboards a driver with valid fields", async () => {
    const token = await createTestToken({
      sub: "driver-onboard-001",
      email: "driver.onboard@evspark.in",
      name: "Rohit Deshmukh",
    });

    const res = await request(app)
      .put("/api/me/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role: "DRIVER",
        fullName: "Rohit Deshmukh",
        phone: "9876543210",
        city: "Mumbai",
        vehicleModelId: "cmv0testvehicle001",
        vehicleRegNo: "MH02AB1234",
        batteryPct: 65,
        connectors: ["CCS2", "Type2"],
        preferredCharging: "DC",
        homeLat: 19.076,
        homeLng: 72.8777,
        homeLabel: "Bandra West, Mumbai",
        workLat: 19.0657,
        workLng: 72.8687,
        workLabel: "BKC, Mumbai",
        maxWaitMin: 15,
        minKw: 50,
        acceptTerms: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.onboarded).toBe(true);
    expect(res.body.user.name).toBe("Rohit Deshmukh");
    expect(res.body.profile.vehicleRegNo).toBe("MH02AB1234");
  });

  it("successfully onboards an operator and creates pending station", async () => {
    const token = await createTestToken({
      sub: "operator-onboard-001",
      email: "cpo.onboard@evspark.in",
      name: "Vikram Malhotra",
    });

    const res = await request(app)
      .put("/api/me/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role: "OPERATOR",
        businessName: "SparkPower Charging Network",
        contactName: "Vikram Malhotra",
        phone: "9123456789",
        gstin: "27AAAAA0000A1Z5",
        stationName: "SparkPower BKC Fast Hub",
        address: "G Block, Bandra Kurla Complex",
        pincode: "400051",
        city: "Mumbai",
        lat: 19.0657,
        lng: 72.8687,
        pricePerKwh: 18.5,
        hours: "24/7",
        amenities: ["WiFi", "Cafe", "Restroom"],
        chargers: [
          { label: "Bay 1", connectorType: "CCS2", powerKw: 60 },
          { label: "Bay 2", connectorType: "CCS2", powerKw: 120 },
        ],
        acceptTerms: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.onboarded).toBe(true);
    expect(res.body.user.role).toBe("OPERATOR");
    expect(res.body.station).toBeDefined();
    expect(res.body.station.name).toBe("SparkPower BKC Fast Hub");
    expect(res.body.station.chargers).toHaveLength(2);
  });

  it("rejects attempt to onboard as ADMIN", async () => {
    const token = await createTestToken({
      sub: "hacker-001",
      email: "user@evspark.in",
      name: "Bad Actor",
    });

    const res = await request(app)
      .put("/api/me/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role: "ADMIN",
        fullName: "Fake Admin",
      });

    // Discriminated union rejects "ADMIN" (either 400 schema error or 403)
    expect([400, 403]).toContain(res.status);
  });

  it("returns 400 on missing required onboarding fields", async () => {
    const token = await createTestToken({
      sub: "driver-bad-001",
      email: "bad.onboard@evspark.in",
    });

    const res = await request(app)
      .put("/api/me/onboarding")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role: "DRIVER",
        fullName: "Test",
        // missing phone, city, vehicle, regNo, home
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
