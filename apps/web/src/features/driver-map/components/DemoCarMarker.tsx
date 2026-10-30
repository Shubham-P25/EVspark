'use client';

import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { Car } from '@phosphor-icons/react';
import type { DemoCar } from '../types';

export function DemoCarMarker({ car }: { car: DemoCar }) {
  const hasTarget = Boolean(car.targetStationId);

  return (
    <AdvancedMarker position={{ lat: car.lat, lng: car.lng }} zIndex={30}>
      <div
        aria-label={`Electric vehicle ${car.id}`}
        className="relative flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-white border border-ev-line shadow-pin transition-all duration-1000 ease-linear pointer-events-none"
        style={{
          transform: `rotate(${car.heading}deg)`,
        }}
      >
        <Car size={13} weight="fill" className="text-ev-ink2" />
        {hasTarget && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-ev-accent border border-white" />
        )}
      </div>
    </AdvancedMarker>
  );
}

