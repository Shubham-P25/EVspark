import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { StationWithWait } from "@evspark/shared";

export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export function useStationsInBbox(bbox?: BoundingBox | null, zoom?: number) {
  const bboxKey = bbox
    ? `${bbox.minLat.toFixed(4)},${bbox.minLng.toFixed(4)},${bbox.maxLat.toFixed(4)},${bbox.maxLng.toFixed(4)}`
    : "all";

  return useQuery({
    queryKey: ["stations", "bbox", bboxKey, zoom ?? 13],
    queryFn: async () => {
      let url = "/api/stations";
      const params = new URLSearchParams();
      if (bbox) {
        params.set("bbox", `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`);
      }
      if (zoom != null) {
        params.set("zoom", zoom.toString());
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      const res = await apiFetch<{ stations: StationWithWait[] }>(url);
      return res.stations || [];
    },
    staleTime: 30000,
  });
}

export function useStation(id: string | null | undefined) {
  return useQuery({
    queryKey: ["station", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiFetch<{ station: StationWithWait } | StationWithWait>(`/api/stations/${id}`);
      return "station" in res ? res.station : res;
    },
    enabled: Boolean(id),
    staleTime: 30000,
  });
}

export interface RecommendParams {
  lat: number;
  lng: number;
  batteryPct?: number;
  connector?: string;
  maxRadiusKm?: number;
}

export function useRecommend(params?: RecommendParams | null) {
  return useQuery({
    queryKey: ["recommend", params?.lat, params?.lng, params?.connector, params?.batteryPct],
    queryFn: async () => {
      if (!params) return [];
      const res = await apiFetch<{ recommendations?: StationWithWait[]; stations?: StationWithWait[] }>(
        "/api/recommend",
        {
          method: "POST",
          body: JSON.stringify({
            userLat: params.lat,
            userLng: params.lng,
            batteryPct: params.batteryPct ?? 50,
            connector: params.connector || "CCS2",
            maxRadiusKm: params.maxRadiusKm ?? 15,
          }),
        }
      );
      return res.recommendations || res.stations || [];
    },
    enabled: Boolean(params && params.lat && params.lng),
    staleTime: 15000,
  });
}

export function useBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const res = await apiFetch<{ bookings: any[] } | any[]>("/api/bookings");
      return Array.isArray(res) ? res : res.bookings || [];
    },
    staleTime: 30000,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await apiFetch<{ favorites: any[] } | any[]>("/api/favorites");
      return Array.isArray(res) ? res : res.favorites || [];
    },
    staleTime: 30000,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["me", "profile"],
    queryFn: async () => {
      try {
        return await apiFetch<any>("/api/me/profile");
      } catch {
        return await apiFetch<any>("/api/me");
      }
    },
    staleTime: 60000,
  });
}

export function useOperatorLive(stationId?: string | null) {
  return useQuery({
    queryKey: ["operator", "live", stationId],
    queryFn: async () => {
      if (stationId) {
        try {
          return await apiFetch<any>(`/api/operator/stations/${stationId}/live`);
        } catch {
          // Fall back to general operator stations
        }
      }
      return await apiFetch<any>("/api/operator/stations");
    },
    refetchInterval: 5000,
    staleTime: 5000,
  });
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      return await apiFetch<any>("/api/admin/overview");
    },
    staleTime: 15000,
    refetchInterval: 15000,
  });
}
