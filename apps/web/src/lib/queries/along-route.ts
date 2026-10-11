import { api } from "@/lib/api";

export interface RouteStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  markerColor: string;
  waitMinutes: number;
  distanceAlongRouteKm: number;
  detourKm: number;
  chargers: { connectorType: string; powerKw: number; status: string }[];
}

export const stationsAlongRoute = (
  polyline: string,
  radiusM = 2000,
  connector?: string,
  minKw?: number
) =>
  api<RouteStation[]>("/api/stations/along-route", {
    method: "POST",
    json: { polyline, radiusM, connector, minKw },
  });
