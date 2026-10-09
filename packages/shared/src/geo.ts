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
