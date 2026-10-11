import type { AnalyticsData, Charger, NetworkStats, RecommendedStation, Station } from "@/types";

const zones = [
  ["Andheri West", 19.1362, 72.8296], ["Bandra Kurla Complex", 19.0659, 72.8636], ["Powai", 19.1197, 72.9056],
  ["Lower Parel", 18.9933, 72.8258], ["Borivali", 19.2307, 72.8567], ["Colaba", 18.906, 72.815],
  ["Dadar", 19.018, 72.843], ["Kurla", 19.073, 72.885], ["Malad", 19.186, 72.849], ["Thane", 19.218, 72.978],
  ["Navi Mumbai", 19.033, 73.029], ["Juhu", 19.107, 72.827], ["Goregaon", 19.162, 72.849], ["Ghatkopar", 19.086, 72.908], ["Mulund", 19.173, 72.958],
] as const;

const names = ["Fast Charge Hub", "EV Point", "Charging Station", "Energy Plaza", "Charge Network"];
const connectors = ["CCS2", "Type2", "CHAdeMO"] as const;

function charger(id: number, index: number): Charger {
  const status = index % 5 === 0 ? "maintenance" : index % 3 === 0 ? "busy" : "free";
  return { id: `C${id}`, label: `Charger ${id}`, connectorType: connectors[index % connectors.length], powerKw: index % 2 ? 22 : 50, status };
}

function createStation(index: number): Station {
  const zone = zones[index % zones.length];
  const queueLength = index % 9;
  return {
    id: `S${String(index + 1).padStart(3, "0")}`,
    name: `${zone[0]} ${names[index % names.length]}`,
    lat: zone[1] + ((index % 5) - 2) * 0.003,
    lng: zone[2] + ((index % 4) - 2) * 0.003,
    address: `${zone[0]}, Mumbai`, operatorName: index % 2 ? "Charge Maharashtra" : "GreenVolt Pvt Ltd",
    chargers: Array.from({ length: 2 + (index % 5) }, (_, chargerIndex) => charger(chargerIndex + 1, index + chargerIndex)),
    queueLength, predictedWaitMin: queueLength * 6, pricePerKwh: 8 + (index % 13), rating: 3.8 + (index % 10) / 10,
    reviewCount: 20 + index * 7, amenities: { restroom: index % 2 === 0, food: index % 3 === 0, wifi: index % 4 !== 0, parking: true },
    status: queueLength > 6 ? "red" : queueLength > 3 ? "yellow" : "green", operatingHours: index % 3 ? "24/7" : "06:00 - 23:00", updatedAt: new Date().toISOString(),
  };
}

export const MOCK_STATIONS = Array.from({ length: 100 }, (_, index) => createStation(index));
export const MOCK_RECOMMENDATIONS: RecommendedStation[] = MOCK_STATIONS.slice(0, 3).map((station, index) => ({ ...station, distanceKm: 1.4 + index * 0.7, driveTimeMin: 5 + index * 3, score: 0.94 - index * 0.16 }));
export const MOCK_ANALYTICS: AnalyticsData = { dailySessions: [42, 38, 55, 61, 78, 94, 87].map((count, index) => ({ date: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index], count, revenue: count * 90 })), hourlyPeak: Array.from({ length: 24 }, (_, hour) => ({ hour, avgQueue: [1, 0, 0, 0, 0, 1, 2, 4, 6, 5, 4, 3, 4, 5, 4, 3, 5, 8, 9, 7, 5, 4, 3, 2][hour] })), totalRevenue: 41000, totalSessions: 455, avgRating: 4.2 };
export const MOCK_NETWORK_STATS: NetworkStats = { totalStations: 100, activeStations: 94, totalSessions: 12480, networkRevenue: 1124200, avgUtilization: 67, modelAccuracy: 91.4 };

export function simulateRealtime(stations: Station[], onUpdate: (updated: Station) => void) {
  const interval = window.setInterval(() => {
    const station = stations[Math.floor(Math.random() * stations.length)];
    const queueLength = Math.max(0, Math.min(10, station.queueLength + (Math.random() > 0.5 ? 1 : -1)));
    onUpdate({ ...station, queueLength, predictedWaitMin: queueLength * 6, status: queueLength > 6 ? "red" : queueLength > 3 ? "yellow" : "green", updatedAt: new Date().toISOString() });
  }, 3000);
  return () => window.clearInterval(interval);
}