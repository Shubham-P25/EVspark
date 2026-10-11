"use client";

import { CircleF, OverlayViewF, OverlayView } from "@react-google-maps/api";

export interface Me {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
}

export function UserLocation({ me }: { me: Me | null }) {
  if (!me) return null;
  return (
    <>
      {me.accuracy ? (
        <CircleF
          center={me}
          radius={Math.min(me.accuracy, 500)}
          options={{
            strokeWeight: 0,
            fillColor: "#1A73E8",
            fillOpacity: 0.12,
            clickable: false,
          }}
        />
      ) : null}
      <OverlayViewF
        position={me}
        mapPaneName={OverlayView.OVERLAY_LAYER}
        getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
      >
        <div className="relative grid size-6 place-items-center">
          {typeof me.heading === "number" && (
            <span
              className="absolute size-12 rounded-full pointer-events-none"
              style={{
                background:
                  "conic-gradient(from -25deg, rgba(26,115,232,.35) 0deg 50deg, transparent 50deg)",
                transform: `rotate(${me.heading}deg)`,
              }}
            />
          )}
          <span className="relative size-4 rounded-full border-[3px] border-white bg-[#1A73E8] shadow-[0_0_0_1px_rgba(0,0,0,.2),0_2px_6px_rgba(0,0,0,.35)]" />
        </div>
      </OverlayViewF>
    </>
  );
}
