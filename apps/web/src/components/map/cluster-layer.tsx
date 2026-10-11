"use client";

import { useMemo } from "react";
import Supercluster from "supercluster";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { COLOR_RANK, MARKER_HEX, type MarkerColor } from "@/lib/tokens";
import { StationMarker, type MarkerStation } from "./station-marker";

type P = { stationId: string; rank: number };
type C = { worst: number };
const RANKS: MarkerColor[] = ["green", "amber", "red", "grey"];

export function ClusterLayer({
  stations,
  bounds,
  zoom,
  selectedId,
  onSelect,
  onClusterClick,
}: {
  stations: MarkerStation[];
  bounds: [number, number, number, number] | null; // west, south, east, north
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClusterClick: (lat: number, lng: number, nextZoom: number) => void;
}) {
  const index = useMemo(() => {
    const idx = new Supercluster<P, C>({
      radius: 60,
      maxZoom: 15,
      map: (p) => ({ worst: p.rank }),
      reduce: (acc, p) => {
        acc.worst = Math.max(acc.worst, p.worst);
      },
    });
    idx.load(
      stations.map((s) => ({
        type: "Feature" as const,
        properties: { stationId: s.id, rank: COLOR_RANK[s.color] ?? 3 },
        geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
      }))
    );
    return idx;
  }, [stations]);

  const byId = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const items = useMemo(
    () => (bounds ? index.getClusters(bounds, Math.round(zoom)).slice(0, 300) : []),
    [index, bounds, zoom]
  );

  return (
    <>
      {items.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        const props = f.properties as {
          cluster?: boolean;
          cluster_id?: number;
          point_count?: number;
          point_count_abbreviated?: string | number;
          worst?: number;
          stationId?: string;
        };
        if (props.cluster) {
          const color = MARKER_HEX[RANKS[props.worst ?? 0]] || MARKER_HEX.grey;
          return (
            <OverlayViewF
              key={`c-${f.id}`}
              position={{ lat, lng }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
            >
              <button
                type="button"
                aria-label={`${props.point_count} stations`}
                onClick={() =>
                  onClusterClick(lat, lng, Math.min(index.getClusterExpansionZoom(Number(f.id)), 18))
                }
                className="grid size-11 place-items-center rounded-full bg-white text-sm font-bold shadow-lg cursor-pointer"
                style={{ border: `3px solid ${color}`, color: "#202124" }}
              >
                {props.point_count_abbreviated}
              </button>
            </OverlayViewF>
          );
        }
        const s = byId.get(props.stationId as string);
        return s ? (
          <StationMarker
            key={s.id}
            s={s}
            selected={s.id === selectedId}
            showLabel={zoom >= 14}
            onSelect={onSelect}
          />
        ) : null;
      })}
    </>
  );
}
