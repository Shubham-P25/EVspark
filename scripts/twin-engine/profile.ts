import fs from "fs";
import path from "path";

const HOURLY_PROFILE_PATH = path.resolve(__dirname, "../../data/patterns/hourly-profile.json");
const DURATION_DIST_PATH = path.resolve(__dirname, "../../data/patterns/duration-distribution.json");

interface HourlyProfileData {
  weekday: number[];
  weekend: number[];
}

interface DurationDistData {
  parameters?: { mu: number; sigma: number };
  meanMinutes?: number;
  minMinutes?: number;
  maxMinutes?: number;
}

let cachedProfile: HourlyProfileData | null = null;
let cachedDuration: DurationDistData | null = null;

function loadProfiles() {
  if (!cachedProfile && fs.existsSync(HOURLY_PROFILE_PATH)) {
    try {
      cachedProfile = JSON.parse(fs.readFileSync(HOURLY_PROFILE_PATH, "utf-8"));
    } catch {
      // fallback
    }
  }

  if (!cachedDuration && fs.existsSync(DURATION_DIST_PATH)) {
    try {
      cachedDuration = JSON.parse(fs.readFileSync(DURATION_DIST_PATH, "utf-8"));
    } catch {
      // fallback
    }
  }
}

export function getHourlyWeight(date: Date): number {
  loadProfiles();
  const hour = date.getHours();
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = day === 0 || day === 6;

  if (cachedProfile) {
    const list = isWeekend ? cachedProfile.weekend : cachedProfile.weekday;
    if (list && list[hour] !== undefined) {
      return list[hour];
    }
  }

  // Fallback defaults
  if (hour >= 8 && hour <= 10) return 1.8;
  if (hour >= 17 && hour <= 21) return 2.4;
  if (hour >= 12 && hour <= 14) return 1.1;
  if (hour >= 23 || hour <= 5) return 0.2;
  return 1.0;
}

export function sampleDurationMinutes(): number {
  loadProfiles();
  const mu = cachedDuration?.parameters?.mu ?? 3.53;
  const sigma = cachedDuration?.parameters?.sigma ?? 0.45;
  const minMin = cachedDuration?.minMinutes ?? 10;
  const maxMin = cachedDuration?.maxMinutes ?? 90;

  // Box-Muller transform for standard normal random
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Log-normal value: exp(mu + sigma * z0)
  const sample = Math.exp(mu + sigma * z0);
  return Math.round(Math.min(maxMin, Math.max(minMin, sample)));
}
