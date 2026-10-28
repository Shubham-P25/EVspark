import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getLiveForTile, type LiveOverlay } from "../src/services/googleLive.service";

describe("Google Live Layer Service Tests", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      GOOGLE_PLACES_SERVER_KEY: "test-fake-key",
      GOOGLE_LIVE_DAILY_CAP: "300",
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns empty map when zoom < 13", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await getLiveForTile(12, 2877, 1826);
    expect(result.size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sums aggregations correctly and sets free/usable/color", async () => {
    const mockApiResponse = {
      places: [
        {
          id: "places/ChIJ12345",
          evChargeOptions: {
            connectorAggregation: [
              {
                type: "EV_CONNECTOR_TYPE_CCS_COMBO_2",
                count: 4,
                availableCount: 2,
                outOfServiceCount: 0,
                availabilityLastUpdateTime: "2026-10-18T10:00:00Z",
              },
              {
                type: "EV_CONNECTOR_TYPE_TYPE_2",
                count: 2,
                availableCount: 1,
                outOfServiceCount: 0,
                availabilityLastUpdateTime: "2026-10-18T10:02:00Z",
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await getLiveForTile(13, 5754, 3652);
    expect(result.size).toBe(1);

    const overlay = result.get("places/ChIJ12345");
    expect(overlay).toBeDefined();
    if (overlay) {
      expect(overlay.total).toBe(6); // 4 + 2
      expect(overlay.free).toBe(3); // 2 + 1
      expect(overlay.usable).toBe(6);
      expect(overlay.color).toBe("orange"); // 3 of 6 free -> orange
      expect(overlay.lastUpdateTimeMs).toBe(new Date("2026-10-18T10:00:00Z").getTime());
    }
  });

  it("skips overlay if availableCount is undefined for every connector", async () => {
    const mockApiResponse = {
      places: [
        {
          id: "places/ChIJ_NoAvailability",
          evChargeOptions: {
            connectorAggregation: [
              {
                type: "EV_CONNECTOR_TYPE_CCS_COMBO_2",
                count: 4,
                // availableCount omitted
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const result = await getLiveForTile(13, 5754, 3652);
    // Should NOT invent availability numbers
    expect(result.size).toBe(0);
  });

  it("handles fetch failure gracefully without throwing and returns empty map", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const result = await getLiveForTile(13, 5754, 3652);
    expect(result.size).toBe(0);
  });
});
