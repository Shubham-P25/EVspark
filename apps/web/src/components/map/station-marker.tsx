"use client";

import { memo } from "react";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { Lightning } from "@phosphor-icons/react";
import { MARKER_HEX, type MarkerColor } from "@/lib/tokens";

export interface MarkerStation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  color: MarkerColor;
  photoUrl?: string | null;
  isOverloaded?: boolean;
  waitLabel?: string; // "Free" | "12 min"
}

function StationMarkerBase({
  s,
  selected,
  showLabel,
  onSelect,
}: {
  s: MarkerStation;
  selected: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const ring = MARKER_HEX[s.color] || MARKER_HEX.grey;

  return (
    <OverlayViewF
      position={{ lat: s.lat, lng: s.lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
    >
      <button
        type="button"
        aria-label={`${s.name}, ${s.waitLabel ?? ""}`}
        onClick={() => onSelect(s.id)}
        className="group relative flex flex-col items-center outline-none cursor-pointer"
        style={{
          transform: selected ? "scale(1.15)" : undefined,
          transition: "transform .15s",
          zIndex: selected ? 10 : 1,
        }}
      >
        {s.isOverloaded && <span className="ev-pulse-ring" style={{ borderColor: ring }} />}
        <span
          className="relative block size-11 overflow-hidden rounded-full bg-white shadow-md"
          style={{
            border: `3px solid ${ring}`,
            boxShadow: selected ? "0 4px 14px rgba(0,0,0,.35)" : "0 2px 6px rgba(0,0,0,.3)",
          }}
        >
          {s.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.photoUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="block size-full" style={{ background: ring }} />
          )}
        </span>
        <span
          className="absolute -right-1 top-6 grid size-5 place-items-center rounded-full bg-white shadow"
          style={{ color: ring }}
        >
          <Lightning weight="fill" size={13} />
        </span>
        {/* pin tail */}
        <span
          className="-mt-[3px] size-2.5 rotate-45 bg-white"
          style={{ borderRight: `3px solid ${ring}`, borderBottom: `3px solid ${ring}` }}
        />
        {showLabel && s.waitLabel && (
          <span
            className="mt-0.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold shadow"
            style={{ color: ring }}
          >
            {s.waitLabel}
          </span>
        )}
      </button>
    </OverlayViewF>
  );
}

export const StationMarker = memo(StationMarkerBase);
