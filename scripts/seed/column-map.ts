export interface NormalizedStation {
  externalId: string;
  name: string;
  operatorName: string;
  state: string;
  district?: string;
  city: string;
  address?: string;
  lat: number;
  lng: number;
  pricePerKwh: number;
  datasetSource: string;
}

export function normalizeStationRow(row: Record<string, any>, source: string): NormalizedStation | null {
  const getField = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== "") {
        return String(row[c]).trim();
      }
      const lower = c.toLowerCase();
      for (const key of Object.keys(row)) {
        if (key.toLowerCase() === lower && row[key] !== undefined && String(row[key]).trim() !== "") {
          return String(row[key]).trim();
        }
      }
    }
    return undefined;
  };

  const name = getField(["name", "station_name", "station name", "title", "charging_station_name"]) || "EV Charging Station";
  const operatorName = getField(["operator", "operator_name", "network", "vendor", "cpo", "company"]) || "Tata Power";
  const state = getField(["state", "state_name", "province"]) || "Maharashtra";
  const district = getField(["district", "county", "district_name"]);
  const city = getField(["city", "town", "location_city"]) || "Mumbai";
  const address = getField(["address", "address_line_1", "address_line", "street", "full_address"]);
  
  const rawLat = getField(["latitude", "lat", "latitude_deg", "y"]);
  const rawLng = getField(["longitude", "lng", "lon", "longitude_deg", "x"]);
  
  const lat = rawLat ? parseFloat(rawLat) : NaN;
  const lng = rawLng ? parseFloat(rawLng) : NaN;

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  // Drops rows with invalid lat/lng (outside 8°N–37°N, 68°E–97°E)
  if (lat < 8 || lat > 37 || lng < 68 || lng > 97) {
    return null;
  }

  const rawId = getField(["external_id", "externalid", "id", "station_id", "stationid", "uid", "uuid"]);
  const externalId = rawId ? `${source}-${rawId}` : `${source}-${lat.toFixed(4)}-${lng.toFixed(4)}`;

  const rawPrice = getField(["price_per_kwh", "price", "tariff", "rate"]);
  const pricePerKwh = rawPrice && !isNaN(parseFloat(rawPrice)) ? parseFloat(rawPrice) : 18.0;

  return {
    externalId,
    name,
    operatorName,
    state,
    district,
    city,
    address,
    lat,
    lng,
    pricePerKwh,
    datasetSource: source,
  };
}
