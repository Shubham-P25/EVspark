"use client";

import React, { useMemo, useCallback, useEffect } from "react";
import Supercluster from "supercluster";
import { useMap } from "@vis.gl/react-google-maps";
import { type PinColor } from "@evspark/shared";
import { usePinStore } from "./stores/pin-store";
import { useMapUiStore } from "./stores/map-ui-store";
import { PinMarker } from "./PinMarker";
import { ClusterMarker } from "./ClusterMarker";
import type { ViewportBounds } from "./hooks/useViewportTiles";

interface PinLayerProps {
  bounds: ViewportBounds | null;
  zoom: number | null;
}

const COLOR_RANK: Record<PinColor, number> = {
  red: 4,
  orange: 3,
  green: 2,
  grey: 1,
};

interface ClusterProperties {
  cluster?: boolean;
  pinId?: string;
  color?: PinColor;
  point_count?: number;
  worstColor?: PinColor;
  worstRank?: number;
}

export function PinLayer({ bounds, zoom }: PinLayerProps) {
  const map = useMap();
  const version = usePinStore((s) => s.version);
  const pins = usePinStore((s) => s.pins);
  const setRenderedCount = usePinStore((s) => s.setRenderedCount);
  const selectedId = useMapUiStore((s) => s.selectedId);
  const filter = useMapUiStore((s) => s.filter);

  // 1. Build Supercluster index ONLY when pin-store version or filter changes
  const supercluster = useMemo(() => {
    const sc = new Supercluster<ClusterProperties, ClusterProperties>({
      radius: 56,
      maxZoom: 16,
      map: (props) => ({
        worstColor: props.color ?? "grey",
        worstRank: COLOR_RANK[props.color ?? "grey"] || 1,
      }),
      reduce: (acc, props) => {
        if ((props.worstRank ?? 1) > (acc.worstRank ?? 1)) {
          acc.worstRank = props.worstRank;
          acc.worstColor = props.worstColor;
        }
      },
    });

    const points: Array<GeoJSON.Feature<GeoJSON.Point, ClusterProperties>> = [];

    pins.forEach((p) => {
      // Local client filtering
      if (filter === "AVAILABLE" && p.free <= 0) return;
      if (filter === "FAST_DC" && p.maxKw < 50) return;

      points.push({
        type: "Feature",
        properties: {
          cluster: false,
          pinId: p.id,
          color: p.color,
        },
        geometry: {
          type: "Point",
          coordinates: [p.lng, p.lat],
        },
      });
    });

    sc.load(points);
    return sc;
  }, [version, filter]); // Memo depends on version number, NEVER on array identity

  // 2. Query clusters for current viewport
  const currentZoom = Math.floor(zoom ?? 13);

  const clusterItems = useMemo(() => {
    if (!bounds || !supercluster) return [];

    const bbox: [number, number, number, number] = [
      bounds.west,
      bounds.south,
      bounds.east,
      bounds.north,
    ];

    // Cap output to 150 items maximum for smooth 60fps pan performance
    const items = supercluster.getClusters(bbox, currentZoom);
    return items.slice(0, 150);
  }, [supercluster, bounds?.north, bounds?.south, bounds?.east, bounds?.west, currentZoom]);

  useEffect(() => {
    setRenderedCount(clusterItems.length);
  }, [clusterItems.length, setRenderedCount]);

  const handleClusterExpand = useCallback(
    (clusterId: number) => {
      if (!map || !supercluster) return;
      try {
        const leaves = supercluster.getLeaves(clusterId, 100);
        if (leaves.length > 0) {
          const latLngBounds = new google.maps.LatLngBounds();
          leaves.forEach((leaf) => {
            latLngBounds.extend({
              lat: leaf.geometry.coordinates[1],
              lng: leaf.geometry.coordinates[0],
            });
          });
          map.fitBounds(latLngBounds, 60);
          return;
        }

        const nextZoom = supercluster.getClusterExpansionZoom(clusterId);
        map.setZoom(nextZoom);
      } catch {
        map.setZoom((map.getZoom() || 13) + 2);
      }
    },
    [map, supercluster]
  );

  return (
    <>
      {clusterItems.map((item) => {
        const [lng, lat] = item.geometry.coordinates;
        const isCluster = item.properties.cluster;

        if (isCluster) {
          const clusterId = item.id as number;
          const count = item.properties.point_count ?? 2;
          const worstColor = item.properties.worstColor ?? "green";

          return (
            <ClusterMarker
              key={`cluster-${clusterId}`}
              clusterId={clusterId}
              count={count}
              lat={lat}
              lng={lng}
              worstColor={worstColor}
              onExpand={handleClusterExpand}
            />
          );
        }

        const pinId = item.properties.pinId!;
        return (
          <PinMarker
            key={`pin-${pinId}`}
            id={pinId}
            selected={pinId === selectedId}
            zoom={currentZoom}
          />
        );
      })}
    </>
  );
}
