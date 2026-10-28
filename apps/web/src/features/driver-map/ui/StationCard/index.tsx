"use client";

import React, { useEffect } from "react";
import { Drawer } from "vaul";
import { usePinStore } from "../../stores/pin-store";
import { useMapUiStore } from "../../stores/map-ui-store";
import { useStationDetail } from "./hooks/useStationDetail";
import { StationCardHeader } from "./Header";
import { LiveRow } from "./LiveRow";
import { StationCardPredictedWait } from "./PredictedWait";
import { StationCardActions } from "./Actions";
import { StationCardTabs } from "./Tabs";
import { StationCardSkeleton } from "./Skeleton";

interface StationCardProps {
  onDirections?: (station: any) => void;
  onBook?: (stationId: string) => void;
}

export function StationCard({ onDirections, onBook }: StationCardProps) {
  const selectedId = useMapUiStore((s) => s.selectedId);
  const setSelectedId = useMapUiStore((s) => s.setSelectedId);

  // Instant render from pin store (<50ms)
  const pin = usePinStore((s) => (selectedId ? s.pins.get(selectedId) : undefined));
  const { station, live, isPending } = useStationDetail(selectedId);

  // 1. ESC key listener & URL sync
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedId) {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, setSelectedId]);

  // URL sync (?station=<id>)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedId) {
      url.searchParams.set("station", selectedId);
      window.history.replaceState({}, "", url.toString());
    } else if (url.searchParams.has("station")) {
      url.searchParams.delete("station");
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedId]);

  if (!selectedId || !pin) return null;

  const content = (
    <div className="flex flex-col h-full bg-white text-[#202124] overflow-y-auto scrollbar-none">
      <StationCardHeader
        name={station?.name || "EV Charging Station"}
        operatorName={station?.operatorName}
        photoUrl={station?.photoUrl}
        pricePerKwh={station?.pricePerKwh}
        ratingAvg={station?.ratingAvg}
        hours={station?.hours}
        onClose={() => setSelectedId(null)}
      />

      <LiveRow
        free={live?.overlay?.free ?? live?.free ?? pin.free}
        usable={live?.overlay?.usable ?? live?.usable ?? pin.usable}
        total={live?.overlay?.total ?? live?.total ?? pin.total}
        color={pin.color}
        source={live?.source ?? pin.source}
        updatedAt={pin.updatedAt}
        chargers={station?.chargers}
      />

      <StationCardPredictedWait
        free={live?.overlay?.free ?? live?.free ?? pin.free}
        waitMinutes={station?.waitMinutes}
        headingCarsCount={station?.vehiclePings?.length ?? 0}
      />

      <StationCardActions
        onDirections={() => onDirections?.(station || pin)}
        onBook={() => onBook?.(selectedId)}
        onShare={() => {
          if (navigator.share) {
            navigator.share({ title: station?.name, url: window.location.href }).catch(() => {});
          }
        }}
      />

      {isPending && !station ? (
        <StationCardSkeleton />
      ) : (
        <StationCardTabs
          chargers={station?.chargers}
          address={station?.address}
          hours={station?.hours}
          amenities={station?.address}
          stationId={selectedId}
          station={station}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop side panel (slide in from left, 408px, elevation 2 shadow) */}
      <div className="hidden lg:block absolute top-0 bottom-0 left-0 w-[408px] z-30 shadow-[0_1px_2px_rgb(60_64_67_/_0.3),_0_2px_6px_2px_rgb(60_64_67_/_0.15)] transition-transform duration-300 pointer-events-auto">
        {content}
      </div>

      {/* Mobile Drawer (Vaul bottom sheet) */}
      <div className="lg:hidden">
        <Drawer.Root open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-white z-50 flex flex-col outline-none shadow-2xl">
              <div className="w-12 h-1.5 bg-[#DADCE0] rounded-full mx-auto my-3 shrink-0" />
              <div className="flex-1 overflow-y-auto">{content}</div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </>
  );
}

export default StationCard;
