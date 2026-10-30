'use client';

import { useCallback, useState } from 'react';
import { MapCanvas } from '@/features/driver-map/components/MapCanvas';
import { Dock } from '@/features/driver-map/components/Dock';
import { SearchPill } from '@/features/driver-map/components/SearchPill';
import { FilterChips } from '@/features/driver-map/components/FilterChips';
import { NearbyPanel } from '@/features/driver-map/components/NearbyPanel';
import { StationCard } from '@/features/driver-map/components/StationCard';
import { MapControls } from '@/features/driver-map/components/MapControls';
import { LiveChip } from '@/features/driver-map/components/LiveChip';
import { AlertStack } from '@/features/driver-map/components/AlertStack';
import { CompareTray } from '@/features/driver-map/components/CompareTray';
import { BottomSheet } from '@/features/driver-map/components/BottomSheet';
import { useStations } from '@/features/driver-map/hooks/useStations';
import { useLiveStatus } from '@/features/driver-map/hooks/useLiveStatus';
import { useUserLocation } from '@/features/driver-map/hooks/useUserLocation';
import { useDriverMap } from '@/features/driver-map/store';
import { useMediaQuery } from '@/lib/useMediaQuery';

export default function DriverMapPage() {
  useUserLocation();
  const [bounds, setBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const { stations, isLoading } = useStations(bounds);
  const { cars, alerts, connection, updatedAgoSec } = useLiveStatus(bounds);
  const selectedId = useDriverMap((s) => s.selectedId);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const onBounds = useCallback((b: google.maps.LatLngBoundsLiteral) => setBounds(b), []);
  const selected = stations.find((s) => s.id === selectedId) ?? null;

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-ev-canvas text-ev-ink font-sans select-none">
      <MapCanvas stations={stations} cars={cars} onBoundsChange={onBounds} />
      <Dock />
      <SearchPill stations={stations} />
      <FilterChips stations={stations} />
      <MapControls />
      <LiveChip
        connection={connection}
        updatedAgoSec={updatedAgoSec}
        freeNearby={stations.filter((s) => s.status === 'free').length}
      />
      <AlertStack alerts={alerts} />
      <CompareTray stations={stations} />
      {isDesktop ? (
        <>
          <NearbyPanel stations={stations} loading={isLoading} />
          {selected && <StationCard station={selected} />}
        </>
      ) : (
        <BottomSheet>
          {selected ? (
            <StationCard station={selected} embedded />
          ) : (
            <NearbyPanel stations={stations} loading={isLoading} embedded />
          )}
        </BottomSheet>
      )}
    </main>
  );
}

