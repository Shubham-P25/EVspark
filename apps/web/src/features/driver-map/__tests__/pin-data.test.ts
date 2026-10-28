import { describe, it, expect, beforeEach } from "vitest";
import { usePinStore } from "../stores/pin-store";
import { computeViewportTiles, type ViewportBounds } from "../hooks/useViewportTiles";
import type { Pin } from "@evspark/shared";

describe("Viewport Tiles Math (useViewportTiles)", () => {
  it("clamps zoom to [10, 14]", () => {
    const bounds: ViewportBounds = {
      north: 19.3,
      south: 19.1,
      east: 73.1,
      west: 72.9,
    };

    // Zoom 8 clamped to 10
    const tilesLow = computeViewportTiles(bounds, 8);
    expect(tilesLow.length).toBeGreaterThan(0);
    expect(tilesLow.every((t) => t.z === 10)).toBe(true);

    // Zoom 18 clamped to 14
    const tilesHigh = computeViewportTiles(bounds, 18);
    expect(tilesHigh.length).toBeGreaterThan(0);
    expect(tilesHigh.every((t) => t.z === 14)).toBe(true);
  });

  it("caps tile output at a maximum of 12 tiles", () => {
    // Very large bounds across all of India at zoom 14
    const wideBounds: ViewportBounds = {
      north: 28.0,
      south: 12.0,
      east: 88.0,
      west: 70.0,
    };

    const tiles = computeViewportTiles(wideBounds, 14);
    expect(tiles.length).toBeLessThanOrEqual(12);
  });

  it("returns empty array when bounds or zoom are null", () => {
    expect(computeViewportTiles(null, 12)).toEqual([]);
    expect(computeViewportTiles({ north: 19, south: 18, east: 73, west: 72 }, null)).toEqual([]);
  });
});

describe("Pin Store (usePinStore)", () => {
  beforeEach(() => {
    usePinStore.getState().clearPins();
  });

  it("upserts new pins and increments version", () => {
    const pinA: Pin = {
      id: "pin-1",
      lat: 19.2,
      lng: 72.9,
      free: 2,
      usable: 4,
      total: 4,
      maxKw: 50,
      color: "orange",
      source: "google",
      updatedAt: 1000,
    };

    usePinStore.getState().upsertPins([pinA]);
    const state = usePinStore.getState();
    expect(state.pins.size).toBe(1);
    expect(state.version).toBe(1);
    expect(state.pins.get("pin-1")).toEqual(pinA);
  });

  it("does NOT create a new Map or increment version when unchanged pins are upserted", () => {
    const pinA: Pin = {
      id: "pin-1",
      lat: 19.2,
      lng: 72.9,
      free: 2,
      usable: 4,
      total: 4,
      maxKw: 50,
      color: "orange",
      source: "google",
      updatedAt: 1000,
    };

    usePinStore.getState().upsertPins([pinA]);
    const firstState = usePinStore.getState();
    const firstMap = firstState.pins;
    const firstVersion = firstState.version;

    // Upsert exact same pin data
    usePinStore.getState().upsertPins([{ ...pinA }]);
    const secondState = usePinStore.getState();

    // Map reference and version must remain strictly identical
    expect(secondState.pins).toBe(firstMap);
    expect(secondState.version).toBe(firstVersion);
  });

  it("updates Map and version when pin status changes", () => {
    const pinA: Pin = {
      id: "pin-1",
      lat: 19.2,
      lng: 72.9,
      free: 2,
      usable: 4,
      total: 4,
      maxKw: 50,
      color: "orange",
      source: "google",
      updatedAt: 1000,
    };

    usePinStore.getState().upsertPins([pinA]);
    const firstMap = usePinStore.getState().pins;

    // Change free chargers from 2 to 0 (all busy -> red)
    const updatedPinA: Pin = {
      ...pinA,
      free: 0,
      color: "red",
    };

    usePinStore.getState().patchPins([updatedPinA]);
    const secondState = usePinStore.getState();

    expect(secondState.pins).not.toBe(firstMap);
    expect(secondState.version).toBe(2);
    expect(secondState.pins.get("pin-1")?.color).toBe("red");
    expect(secondState.pins.get("pin-1")?.free).toBe(0);
  });
});
