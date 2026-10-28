import { useState, useEffect, useRef } from "react";
import { latLngToTile } from "@evspark/shared";

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
  key: string;
}

export function computeViewportTiles(
  bounds: ViewportBounds | null,
  zoom: number | null | undefined
): TileCoord[] {
  if (!bounds || zoom === null || zoom === undefined) return [];

  // Clamp zoom to 10..14
  const z = Math.min(Math.max(Math.round(zoom), 10), 14);

  const { north, south, east, west } = bounds;

  const p1 = latLngToTile(north, west, z);
  const p2 = latLngToTile(south, east, z);

  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const tiles: TileCoord[] = [];
  const centerLat = (north + south) / 2;
  const centerLng = (east + west) / 2;
  const centerTile = latLngToTile(centerLat, centerLng, z);

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ z, x, y, key: `${z}:${x}:${y}` });
    }
  }

  // Cap at 12 tiles maximum, prioritizing center tiles
  if (tiles.length > 12) {
    tiles.sort((a, b) => {
      const distA = Math.hypot(a.x - centerTile.x, a.y - centerTile.y);
      const distB = Math.hypot(b.x - centerTile.x, b.y - centerTile.y);
      return distA - distB;
    });
    return tiles.slice(0, 12);
  }

  return tiles;
}

export function useViewportTiles(
  bounds: ViewportBounds | null,
  zoom: number | null | undefined
): TileCoord[] {
  const [tiles, setTiles] = useState<TileCoord[]>(() => computeViewportTiles(bounds, zoom));
  const latestKeysRef = useRef<string>("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const newTiles = computeViewportTiles(bounds, zoom);
      const newKeys = newTiles.map((t) => t.key).sort().join(",");

      if (newKeys !== latestKeysRef.current) {
        latestKeysRef.current = newKeys;
        setTiles(newTiles);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [bounds?.north, bounds?.south, bounds?.east, bounds?.west, zoom]);

  return tiles;
}
