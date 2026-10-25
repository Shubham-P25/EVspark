/** Time until the n-th (1-based) charger release, assuming each new session lasts avgS. */
export function waitForNth(freeInS: number[], n: number, avgS: number): number {
  if (!freeInS.length) return Infinity;
  const a = [...freeInS].sort((x, y) => x - y);
  for (let i = 1; i < n; i++) {
    const t = a.shift()! + avgS;
    a.push(t);
    a.sort((x, y) => x - y);
  }
  return a[0];
}

/** Share of queued cars that really plug in (system learns it; prior 0.65 with weight 5). */
export const intentRatio = (plugged: number, otherJobs: number, prior = 0.65, w = 5) =>
  (plugged + prior * w) / (plugged + otherJobs + w);

export interface WaitEstimate { waitingCount: number; nextCarWaitS: number | null; perPositionS: (number | null)[] }

export function estimateWaits(freeInS: number[], waitingCount: number, avgS: number, p: number): WaitEstimate {
  if (!freeInS.length) return { waitingCount, nextCarWaitS: null, perPositionS: Array(waitingCount).fill(null) };
  const per = Array.from({ length: waitingCount }, (_, i) => waitForNth(freeInS, Math.max(1, Math.ceil((i + 1) * p)), avgS));
  return { waitingCount, nextCarWaitS: waitForNth(freeInS, Math.max(1, Math.ceil((waitingCount + 1) * p)), avgS), perPositionS: per };
}
