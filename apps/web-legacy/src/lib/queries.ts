"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "./api";
import { getSocket } from "./socket";

export interface StationSummary {
  id: string;
  name: string;
  operatorName: string;
  operator?: string;
  city: string;
  address?: string;
  lat: number;
  lng: number;
  pricePerKwh: number;
  ratingAvg?: number;
  waitMinutes: number;
  availableChargers: number;
  totalChargers: number;
  markerColor: "green" | "yellow" | "red";
  isOverloaded?: boolean;
  queueCount?: number;
  queueEntries?: any[];
  chargers?: Array<{
    id: string;
    label: string;
    connectorType: string;
    powerKw: number;
    status: "FREE" | "BUSY" | "FAULTED" | "MAINTENANCE";
  }>;
}

export function useStationsNearby(lat: number, lng: number, radiusKm: number = 25) {
  return useQuery<StationSummary[]>({
    queryKey: ["stations", "nearby", lat, lng, radiusKm],
    queryFn: () => api.get(`/api/stations/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });
}

export function useStations() {
  return useQuery<StationSummary[]>({
    queryKey: ["stations", "all"],
    queryFn: () => api.get("/api/stations"),
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });
}

export function useStation(id: string | null) {
  return useQuery({
    queryKey: ["station", id],
    queryFn: () => (id ? api.get(`/api/stations/${id}`) : null),
    enabled: !!id,
    staleTime: 10000,
  });
}

export function useVehicles() {
  return useQuery<any[]>({
    queryKey: ["vehicles", "all"],
    queryFn: () => api.get("/api/vehicles"),
    staleTime: 60000,
  });
}

export function useOperatorSessions() {
  return useQuery<any[]>({
    queryKey: ["operator", "sessions"],
    queryFn: () => api.get("/api/operator/sessions"),
    staleTime: 10000,
    refetchInterval: 15000,
  });
}

export function useOperatorRevenue() {
  return useQuery<any>({
    queryKey: ["operator", "revenue"],
    queryFn: () => api.get("/api/operator/analytics/revenue"),
    staleTime: 30000,
  });
}

export function useRecommend(lat: number, lng: number, connector?: string) {
  return useMutation({
    mutationFn: (data?: { lat?: number; lng?: number; connector?: string }) =>
      api.post("/api/recommend", {
        lat: data?.lat ?? lat,
        lng: data?.lng ?? lng,
        connector: data?.connector ?? connector ?? "CCS2",
      }),
  });
}

export function useSimConfig() {
  return useQuery({
    queryKey: ["admin", "sim-config"],
    queryFn: () => api.get("/api/admin/sim-config"),
    staleTime: 5000,
  });
}

export function useUpdateSimConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      speed?: number;
      surgeStations?: string[];
      arrivalsPerMin?: number;
      running?: boolean;
      surgeMultiplier?: number;
    }) => api.patch("/api/admin/sim-config", data),
    onSuccess: (updated) => {
      qc.setQueryData(["admin", "sim-config"], updated);
    },
  });
}

export function useLiveDeltas() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = getSocket();

    const handleDelta = (data: { stations: Array<Partial<StationSummary> & { id: string }> }) => {
      if (!data || !Array.isArray(data.stations)) return;

      const deltaMap = new Map<string, Partial<StationSummary>>();
      for (const item of data.stations) {
        deltaMap.set(item.id, item);
      }

      // Update nearby queries cache
      queryClient.setQueriesData<StationSummary[]>({ queryKey: ["stations", "nearby"] }, (old) => {
        if (!old) return old;
        return old.map((st) => {
          const delta = deltaMap.get(st.id);
          if (!delta) return st;
          return {
            ...st,
            ...delta,
          };
        });
      });

      // Update individual station detail cache if open
      for (const item of data.stations) {
        queryClient.setQueryData(["station", item.id], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            ...item,
          };
        });
      }
    };

    s.on("stations:delta", handleDelta);

    return () => {
      s.off("stations:delta", handleDelta);
    };
  }, [queryClient]);
}
