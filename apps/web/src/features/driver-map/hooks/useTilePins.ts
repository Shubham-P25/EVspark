import { useEffect } from "react";
import { type Pin, type PinColor } from "@evspark/shared";
import { usePinStore } from "../stores/pin-store";
import type { TileCoord, ViewportBounds } from "./useViewportTiles";
import { loadViewport, type StationPoint } from "../../map/stations/tile-store";

function stationPointToPin(p: StationPoint): Pin {
  const color: PinColor = p.status === 0 ? "green" : p.status === 1 ? "orange" : p.status === 2 ? "red" : "grey";
  return {
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    free: p.free,
    usable: p.status === 2 ? 0 : p.total,
    total: p.total,
    maxKw: 50,
    color,
    source: "twin",
    updatedAt: Date.now(),
  };
}

export function useTilePins(_tiles: TileCoord[], _connector?: string, bounds?: ViewportBounds | null) {
  const upsertPins = usePinStore((s) => s.upsertPins);

  useEffect(() => {
    if (!bounds) return;
    let cancelled = false;
    const t0 = performance.now();

    loadViewport({
      w: bounds.west,
      s: bounds.south,
      e: bounds.east,
      n: bounds.north,
    })
      .then((points) => {
        if (cancelled) return;
        const duration = Math.round(performance.now() - t0);
        usePinStore.getState().recordTileFetch(duration, true);
        if (points.length > 0) {
          upsertPins(points.map(stationPointToPin));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [bounds?.west, bounds?.south, bounds?.east, bounds?.north, upsertPins]);

  return {
    isPending: false,
    isError: false,
    error: null,
  };
}
