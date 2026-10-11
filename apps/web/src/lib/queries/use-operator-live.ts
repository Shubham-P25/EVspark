"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LiveCharger } from "@/lib/live";

export interface OperatorLive {
  station: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    pricePerKwh: number;
    hours?: string | null;
    ratingAvg?: number | null;
    status: string;
  };
  chargers: LiveCharger[];
  queue: {
    id: string;
    vehicleRef: string;
    connector: string;
    etaTs?: string | null;
    position?: number;
  }[];
  kpis: {
    revenueToday: number;
    completedRevenueToday: number;
    energyTodayKwh: number;
    completedKwhToday: number;
    sessionsToday: number;
    avgWaitMin: number;
    occupancyPct: number;
    uptimePct: number;
    tariff: number;
  };
  recentEvents: {
    ts: string;
    type: string;
    text: string;
  }[];
}

export function useOperatorLive(stationId: string | undefined) {
  return useQuery({
    queryKey: ["operator-live", stationId],
    queryFn: () => api<OperatorLive>(`/api/operator/stations/${stationId}/live`),
    enabled: !!stationId,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
