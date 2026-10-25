import { useEffect } from "react";
import { type PinColor } from "@evspark/shared";
import { mapJoin, mapLeave, onLiveDelta } from "@/lib/socket";
import { usePinStore } from "../stores/pin-store";
import type { TileCoord, ViewportBounds } from "./useViewportTiles";
import { tilesFor } from "../../map/stations/tile-store";

export function useLiveDeltas(_tiles: TileCoord[], bounds?: ViewportBounds | null) {
  const patchPins = usePinStore((s) => s.patchPins);

  useEffect(() => {
    if (!bounds) return;
    const tileList = tilesFor({ w: bounds.west, s: bounds.south, e: bounds.east, n: bounds.north });
    const rooms = tileList.map((t) => `tile:11:${t.x}:${t.y}`);

    if (rooms.length > 0) {
      mapJoin(rooms);
    }

    const unsubscribe = onLiveDelta((delta) => {
      const deltaPins = Object.entries(delta).map(([stationId, packed]) => {
        const [s, f, tot, w] = packed.split("|").map(Number);
        const color: PinColor = s === 0 ? "green" : s === 1 ? "orange" : s === 2 ? "red" : "grey";
        return {
          id: stationId,
          free: f ?? 0,
          total: tot ?? 0,
          color,
          waitMinutes: w ?? 0,
        } as unknown as import("@evspark/shared").Pin;
      });

      if (deltaPins.length > 0) {
        patchPins(deltaPins);
      }
    });

    return () => {
      unsubscribe();
      if (rooms.length > 0) {
        mapLeave(rooms);
      }
    };
  }, [bounds?.west, bounds?.south, bounds?.east, bounds?.north, patchPins]);
}
