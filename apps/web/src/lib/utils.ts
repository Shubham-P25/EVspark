export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatWait(minutes: number) {
  return minutes === 0 ? "No wait" : `${minutes} min wait`;
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 6371;
  const latDelta = ((lat2 - lat1) * Math.PI) / 180;
  const lngDelta = ((lng2 - lng1) * Math.PI) / 180;
  const value = Math.sin(latDelta / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(lngDelta / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}