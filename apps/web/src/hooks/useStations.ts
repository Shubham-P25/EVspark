"use client";

import { useEffect, useState } from "react";
import { DEMO, apiFetch } from "@/lib/api";
import { MOCK_STATIONS } from "@/lib/mockData";
import type { Station } from "@/types";

export function useStations() {
  const [stations, setStations] = useState<Station[]>(DEMO ? MOCK_STATIONS : []);
  const [loading, setLoading] = useState(!DEMO);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (DEMO) return;
    apiFetch<Station[]>("/api/stations").then(setStations).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  return { stations, setStations, loading, error };
}