'use client';

import React from 'react';
import { Lightning, Heart } from '@phosphor-icons/react';
import { Pill } from './ui-bits';
import { useDriverMap } from '../store';
import type { Station } from '../types';

type Props = {
  station: Station;
  selected: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
};

export const StationListItem = React.memo(function StationListItem({
  station,
  selected,
  onSelect,
  onHover,
}: Props) {
  const isFav = useDriverMap((s) => s.favourites.has(station.id));
  const toggleFav = useDriverMap((s) => s.toggleFav);

  const statusTone =
    station.status === 'free'
      ? 'free'
      : station.status === 'busy'
        ? 'busy'
        : station.status === 'full'
          ? 'full'
          : 'neutral';

  const waitTone = station.freeChargers > 0 ? 'free' : 'neutral';
  const waitLabel = station.freeChargers > 0 ? 'No wait' : `~${station.waitMin ?? 5} min wait`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex h-[92px] items-center gap-3 rounded-[14px] p-3 text-left transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ev-accent ${
        selected
          ? 'bg-ev-accentSoft border-[1.5px] border-ev-accent'
          : 'hover:bg-ev-cardSoft border border-transparent'
      }`}
      style={{ contentVisibility: 'auto' }}
    >
      {/* 56x56 Photo or Fallback */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-ev-cardSoft border border-ev-line flex items-center justify-center">
        {station.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={station.photoUrl}
            alt={station.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <Lightning size={24} weight="fill" className="text-ev-ink3" />
        )}
      </div>

      {/* Info zone */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden min-w-0">
        <div>
          <div className="truncate text-[15px] font-semibold text-ev-ink leading-tight">
            {station.name}
          </div>
          <div className="truncate font-mono text-[13px] text-ev-ink2 leading-tight mt-0.5">
            {station.distanceKm != null ? `${station.distanceKm.toFixed(1)} km` : 'Near you'}
            {station.driveMin != null ? ` · ${station.driveMin} min drive` : ''}
          </div>
        </div>

        {/* Pills row */}
        <div className="flex items-center gap-1.5 mt-1">
          <Pill tone={statusTone}>{station.freeChargers} free</Pill>
          <Pill tone={waitTone}>{waitLabel}</Pill>
        </div>
      </div>

      {/* Heart Favourite Button */}
      <button
        type="button"
        aria-label={isFav ? 'Remove from favourites' : 'Save to favourites'}
        onClick={(e) => {
          e.stopPropagation();
          toggleFav(station.id);
        }}
        className="shrink-0 p-1.5 rounded-full text-ev-ink3 hover:text-ev-accent active:scale-90 transition-transform"
      >
        <Heart
          size={18}
          weight={isFav ? 'fill' : 'regular'}
          className={isFav ? 'text-ev-accent' : 'text-ev-ink3'}
        />
      </button>
    </div>
  );
});

