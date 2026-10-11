const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function inr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "₹0";
  return inrFormatter.format(n);
}

export function mins(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0 min";
  const rounded = Math.round(n);
  return `${rounded} min`;
}

export function km(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0 km";
  if (n < 1) {
    return `${Math.round(n * 1000)} m`;
  }
  return `${n.toFixed(1)} km`;
}

export function mmss(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || Number.isNaN(totalSeconds) || totalSeconds <= 0) return "00:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function num(n: number | null | undefined, d = 0): string {
  if (n == null || Number.isNaN(n)) return "0";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}
