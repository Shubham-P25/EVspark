const min = Number(process.env.FOCUS_ARRIVAL_MIN_SEC ?? 60) * 1000;
const max = Number(process.env.FOCUS_ARRIVAL_MAX_SEC ?? 300) * 1000;

export const focusIds = new Set(
  (process.env.FOCUS_STATION_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

/** Random delay in [min, max] ms until the next vehicle arrives at a focused station. */
export const nextFocusDelayMs = () => Math.round(min + Math.random() * (max - min));
