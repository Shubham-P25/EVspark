"use client";

import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { useMapDemo } from "../map-demo/ui/useMapDemo";
import { useMapUiStore } from "./stores/map-ui-store";

export function DemoSlot() {
  const map = useMap();
  const demoOpen = useMapUiStore((s) => s.demoOpen);
  const start = useMapDemo((s) => s.start);
  const stop = useMapDemo((s) => s.stop);
  const state = useMapDemo((s) => s.state);

  useEffect(() => {
    if (!map) return;

    if (demoOpen && state === "idle") {
      start(map);
    } else if (!demoOpen && state === "running") {
      stop();
    }
  }, [map, demoOpen, state, start, stop]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return null;
}

export default DemoSlot;
