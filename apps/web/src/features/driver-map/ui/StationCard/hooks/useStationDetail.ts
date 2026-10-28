import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { subscribeStation, unsubscribeStation } from "@/lib/socket";

export interface StationDetailData {
  id: string;
  name: string;
  operatorName: string;
  address?: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  pricePerKwh: number;
  hours?: string;
  ratingAvg?: number;
  photoUrl?: string;
  chargers: Array<{
    id: string;
    label?: string;
    connectorType: string;
    powerKw: number;
    status: "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";
  }>;
  queueEntries?: Array<{ id: string; status: string }>;
  vehiclePings?: Array<{ id: string }>;
  waitMinutes?: number;
}

export interface StationLiveDetail {
  source: "google" | "twin" | "none";
  free?: number;
  usable?: number;
  total?: number;
  overlay?: {
    free?: number;
    usable?: number;
    total?: number;
    lastUpdateTimeMs?: number;
    connectorAggregation?: any[];
  };
  chargers?: any[];
}

export function useStationDetail(id: string | null) {
  useEffect(() => {
    if (!id) return;
    subscribeStation(id);
    return () => {
      unsubscribeStation(id);
    };
  }, [id]);

  const query = useQuery({
    queryKey: ["station", id],
    queryFn: async () => {
      if (!id) return null;
      return apiFetch<StationDetailData>(`/api/stations/${id}`);
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });

  const liveQuery = useQuery({
    queryKey: ["station-live", id],
    queryFn: async () => {
      if (!id) return null;
      return apiFetch<StationLiveDetail>(`/api/stations/${id}/live`);
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });

  return {
    station: query.data,
    live: liveQuery.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
