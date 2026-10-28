"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface RouteLineProps {
  path?: Array<{ lat: number; lng: number }> | null;
  strokeColor?: string;
  strokeWeight?: number;
}

export function RouteLine({
  path,
  strokeColor = "#1A73E8",
  strokeWeight = 5,
}: RouteLineProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!path || path.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path,
        strokeColor,
        strokeOpacity: 0.85,
        strokeWeight,
        map,
      });
    } else {
      polylineRef.current.setPath(path);
      polylineRef.current.setOptions({ strokeColor, strokeWeight });
      polylineRef.current.setMap(map);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path, strokeColor, strokeWeight]);

  return null;
}
