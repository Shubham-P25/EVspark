export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateDriveMinutes(distanceKm: number, avgSpeedKmh = 35): number {
  return Math.max(1, Math.round((distanceKm / avgSpeedKmh) * 60));
}

export function isWithinGeofence(
  driverLat: number,
  driverLng: number,
  stationLat: number,
  stationLng: number,
  geofenceRadiusMeters = 150
): boolean {
  const distanceKm = haversineKm(driverLat, driverLng, stationLat, stationLng);
  return distanceKm * 1000 <= geofenceRadiusMeters;
}

export function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; zoom: number } {
  const z = Math.min(Math.max(zoom, 0), 22);
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(x, n - 1)), y: Math.max(0, Math.min(y, n - 1)), zoom: z };
}

export function bboxToTiles(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
  zoom: number
): Array<{ x: number; y: number; zoom: number; key: string }> {
  const p1 = latLngToTile(maxLat, minLng, zoom);
  const p2 = latLngToTile(minLat, maxLng, zoom);
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  const tiles: Array<{ x: number; y: number; zoom: number; key: string }> = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ x, y, zoom, key: `tile:${zoom}:${x}:${y}` });
    }
  }
  return tiles;
}

