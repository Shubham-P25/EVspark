'use client';

import React, { useState } from 'react';
import {
  NavigationArrow,
  MapPin,
  X,
  ArrowSquareOut,
  Stop,
} from '@phosphor-icons/react';
import { useDriverMap } from '../store';
import { useRoute } from '../hooks/useRoute';
import type { Station } from '../types';

type Props = {
  station: Station;
  onCancel: () => void;
};

export function StartRouteCard({ station, onCancel }: Props) {
  const [isDriving, setIsDriving] = useState(false);
  const user = useDriverMap((s) => s.user);
  const startRoute = useDriverMap((s) => s.startRoute);
  const { data: route } = useRoute(user, station.id);

  const distanceKm = route?.distanceKm ?? station.distanceKm ?? 3.4;
  const etaMin = route?.etaMin ?? station.driveMin ?? 11;
  const matchScore = route?.matchScore ?? 86;

  // Calculate arrival time
  const arrivalDate = new Date(Date.now() + etaMin * 60000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const matchLabel =
    matchScore >= 80 ? 'Great match' : matchScore >= 60 ? 'Good match' : 'Okay match';

  const handleStartDriving = () => {
    setIsDriving(true);
    startRoute(station.id);
  };

  const handleStopDriving = () => {
    setIsDriving(false);
    startRoute(null);
    onCancel();
  };

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, '_blank');
  };

  if (isDriving) {
    return (
      <div className="flex items-center justify-between rounded-card border border-ev-line bg-ev-card p-3 shadow-ev animate-in fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ev-accent text-white animate-pulse">
            <NavigationArrow size={16} weight="fill" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-ev-ink">
              Driving to {station.name}
            </div>
            <div className="font-mono text-[11px] text-ev-ink2">
              {distanceKm} km · {etaMin} min remaining
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Stop navigation"
          onClick={handleStopDriving}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-ev-cardSoft border border-ev-line px-3 text-xs font-semibold text-ev-accent hover:bg-ev-accentSoft active:scale-95"
        >
          <Stop size={14} weight="fill" />
          <span>Stop</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-ev-line bg-ev-card p-4 shadow-ev select-none">
      {/* Title + Match score */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-ev-ink3">Planned navigation</span>
          <h3 className="text-base font-semibold text-ev-ink leading-tight mt-0.5">
            Route to {station.name}
          </h3>
        </div>

        {/* 56px Match score ring */}
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-ev-cardSoft stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-ev-accent stroke-current"
                strokeDasharray={`${matchScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-ev-ink">
              {matchScore}%
            </span>
          </div>
          <span className="text-[10px] font-medium text-ev-ink2 mt-0.5">{matchLabel}</span>
        </div>
      </div>

      {/* Hero numbers */}
      <div className="flex items-baseline gap-4 py-1">
        <div>
          <span className="font-mono text-[28px] font-semibold tracking-tight text-ev-ink leading-none">
            {distanceKm}
          </span>
          <span className="ml-1 text-xs font-medium text-ev-ink3">km</span>
        </div>
        <div className="h-4 w-[1px] bg-ev-line" />
        <div>
          <span className="font-mono text-[28px] font-semibold tracking-tight text-ev-ink leading-none">
            {etaMin}
          </span>
          <span className="ml-1 text-xs font-medium text-ev-ink3">min</span>
        </div>
      </div>

      {/* 3 Stat Boxes */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[14px] bg-ev-cardSoft p-2 text-center border border-ev-line/60">
          <div className="text-[10px] font-medium text-ev-ink3">Arrive at</div>
          <div className="font-mono text-xs font-semibold text-ev-ink mt-0.5">
            {arrivalTimeStr}
          </div>
        </div>
        <div className="rounded-[14px] bg-ev-cardSoft p-2 text-center border border-ev-line/60">
          <div className="text-[10px] font-medium text-ev-ink3">Wait on arrival</div>
          <div className="font-mono text-xs font-semibold text-ev-free mt-0.5">
            {station.freeChargers > 0 ? 'No wait' : `~${station.waitMin ?? 5}m`}
          </div>
        </div>
        <div className="rounded-[14px] bg-ev-cardSoft p-2 text-center border border-ev-line/60">
          <div className="text-[10px] font-medium text-ev-ink3">Est. battery</div>
          <div className="font-mono text-xs font-semibold text-ev-ink mt-0.5">42%</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={openGoogleMaps}
          className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-ev-line bg-ev-card px-4 text-xs font-semibold text-ev-ink hover:bg-ev-cardSoft active:scale-95"
        >
          <ArrowSquareOut size={15} />
          <span>Google Maps</span>
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center px-3 text-xs font-medium text-ev-ink3 hover:text-ev-ink"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleStartDriving}
          className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full bg-ev-accent px-4 text-xs font-semibold text-white shadow-pin hover:bg-ev-accentDeep active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
        >
          <NavigationArrow size={16} weight="fill" />
          <span>Start driving</span>
        </button>
      </div>
    </div>
  );
}

