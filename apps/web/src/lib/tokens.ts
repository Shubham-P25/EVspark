export const EV_TOKENS = {
  text: "#202124",
  muted: "#5F6368",
  border: "#DADCE0",
  pageBg: "#F8F9FA",
  surface: "#FFFFFF",
  primary: "#1A73E8",
  actionBlue: "#1A73E8",
  available: "#1E8E3E",
  busy: "#F9AB00",
  overload: "#D93025",
  offline: "#80868B",
} as const;

export type EvTokenName = keyof typeof EV_TOKENS;

export type MarkerColor = "green" | "amber" | "red" | "grey";

export const MARKER_HEX: Record<MarkerColor, string> = {
  green: "#1E8E3E",
  amber: "#F9AB00",
  red: "#D93025",
  grey: "#80868B",
};

export function toMarkerColor(v: string | undefined): MarkerColor {
  if (v === "green" || v === "amber" || v === "red") return v;
  return "grey";
}

export const COLOR_RANK: Record<MarkerColor, number> = {
  green: 0,
  amber: 1,
  red: 2,
  grey: 3,
};
