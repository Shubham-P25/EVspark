/**
 * Curated high-resolution EV charging station imagery
 * Provides realistic photos of modern EV charging plazas, Tesla Supercharger style hubs,
 * Tata Power EZ, Jio-bp pulse, underground bays, and highway solar canopies.
 */

export interface StationPhoto {
  url: string;
  caption: string;
  tag: "DC Fast Bay" | "Solar Canopy" | "Lounge & Cafe" | "Night Illumination" | "High Speed Hub";
}

// Curated high quality photos from verified Unsplash EV charging collection
export const CURATED_EV_PHOTOS: StationPhoto[] = [
  {
    url: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    caption: "High-Power 120kW Dual DC Fast Charging Dispensers",
    tag: "DC Fast Bay",
  },
  {
    url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    caption: "Modern Solar-Canopied EV Plaza with Rest Amenities",
    tag: "Solar Canopy",
  },
  {
    url: "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1200&q=80",
    caption: "Dedicated Electric Vehicle Fast Charging Bay",
    tag: "High Speed Hub",
  },
  {
    url: "https://images.unsplash.com/photo-1558441719-72f5341cfab0?auto=format&fit=crop&w=1200&q=80",
    caption: "CCS2 High-Capacity Smart Fast Charger in Operation",
    tag: "DC Fast Bay",
  },
  {
    url: "https://images.unsplash.com/photo-1647427017067-8f33cd449248?auto=format&fit=crop&w=1200&q=80",
    caption: "Multi-Bay Ultra-Fast Highway Charging Hub",
    tag: "High Speed Hub",
  },
  {
    url: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80",
    caption: "24/7 Illuminated Safe Evening Charging Terminal",
    tag: "Night Illumination",
  },
  {
    url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80",
    caption: "Eco-Friendly Green Power Solar Canopy Station",
    tag: "Solar Canopy",
  },
  {
    url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    caption: "Highway Express Corridor Charging Station with Cafe & WiFi",
    tag: "Lounge & Cafe",
  },
];

// Operator-specific photo mappings
export const OPERATOR_PHOTO_MAP: Record<string, StationPhoto[]> = {
  "tata power": [
    CURATED_EV_PHOTOS[0],
    CURATED_EV_PHOTOS[3],
    CURATED_EV_PHOTOS[1],
    CURATED_EV_PHOTOS[5],
  ],
  "jio-bp": [
    CURATED_EV_PHOTOS[2],
    CURATED_EV_PHOTOS[4],
    CURATED_EV_PHOTOS[7],
    CURATED_EV_PHOTOS[1],
  ],
  "statiq": [
    CURATED_EV_PHOTOS[1],
    CURATED_EV_PHOTOS[0],
    CURATED_EV_PHOTOS[5],
    CURATED_EV_PHOTOS[4],
  ],
  "magenta": [
    CURATED_EV_PHOTOS[3],
    CURATED_EV_PHOTOS[6],
    CURATED_EV_PHOTOS[2],
    CURATED_EV_PHOTOS[0],
  ],
  "zeon": [
    CURATED_EV_PHOTOS[4],
    CURATED_EV_PHOTOS[2],
    CURATED_EV_PHOTOS[0],
    CURATED_EV_PHOTOS[7],
  ],
  "adani": [
    CURATED_EV_PHOTOS[1],
    CURATED_EV_PHOTOS[5],
    CURATED_EV_PHOTOS[3],
    CURATED_EV_PHOTOS[2],
  ],
  "ather": [
    CURATED_EV_PHOTOS[2],
    CURATED_EV_PHOTOS[0],
    CURATED_EV_PHOTOS[6],
  ],
  "ola": [
    CURATED_EV_PHOTOS[4],
    CURATED_EV_PHOTOS[2],
    CURATED_EV_PHOTOS[5],
  ],
};

/**
 * Returns a guaranteed rich photo list (3-4 photos) for any station
 */
export function getStationPhotoList(station: {
  id?: string;
  name?: string;
  operatorName?: string;
  photoUrl?: string | null;
}): StationPhoto[] {
  const list: StationPhoto[] = [];

  // If station has explicit photoUrl, put it first
  if (station.photoUrl && station.photoUrl.trim().length > 0) {
    list.push({
      url: station.photoUrl,
      caption: `${station.name || "Station"} Charging Terminal`,
      tag: "DC Fast Bay",
    });
  }

  // Find operator-matched photos
  const opKey = (station.operatorName || station.name || "").toLowerCase();
  let matchedSet: StationPhoto[] | undefined;
  for (const [key, photos] of Object.entries(OPERATOR_PHOTO_MAP)) {
    if (opKey.includes(key)) {
      matchedSet = photos;
      break;
    }
  }

  // Consistent pseudo-random offset based on station id or name
  const str = station.id || station.name || "evspark";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const offset = Math.abs(hash) % CURATED_EV_PHOTOS.length;

  const pool = matchedSet || [
    CURATED_EV_PHOTOS[offset % CURATED_EV_PHOTOS.length],
    CURATED_EV_PHOTOS[(offset + 1) % CURATED_EV_PHOTOS.length],
    CURATED_EV_PHOTOS[(offset + 2) % CURATED_EV_PHOTOS.length],
    CURATED_EV_PHOTOS[(offset + 3) % CURATED_EV_PHOTOS.length],
  ];

  for (const p of pool) {
    if (!list.some((existing) => existing.url === p.url)) {
      list.push(p);
    }
    if (list.length >= 4) break;
  }

  return list;
}

/**
 * Get primary photo thumbnail URL for a station
 */
export function getPrimaryStationPhoto(station: {
  id?: string;
  name?: string;
  operatorName?: string;
  photoUrl?: string | null;
}): string {
  const photos = getStationPhotoList(station);
  return photos[0]?.url || CURATED_EV_PHOTOS[0].url;
}
