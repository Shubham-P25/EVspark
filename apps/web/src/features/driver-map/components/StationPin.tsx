'use client';

import React, { useState } from 'react';
import { Lightning } from '@phosphor-icons/react';
import type { Station } from '../types';

const COLOR = {
  free: 'var(--ev-free)',
  busy: 'var(--ev-busy)',
  full: 'var(--ev-full)',
  offline: 'var(--ev-offline)',
} as const;

type Props = {
  station: Station;
  selected: boolean;
  onHover: (hovered: boolean) => void;
  onSelect?: () => void;
};

export const StationPin = React.memo(
  function StationPin({ station, selected, onHover, onSelect }: Props) {
    const [isHovered, setIsHovered] = useState(false);
    const showBadge = station.status === 'free' || station.status === 'busy';

    const handleMouseEnter = () => {
      setIsHovered(true);
      onHover(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      onHover(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.();
      }
    };

    const waitText =
      station.status === 'free' || station.waitMin == null
        ? 'no wait'
        : `~${station.waitMin} min wait`;

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${station.name}, ${station.freeChargers} free, ${waitText}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
        className="relative flex flex-col items-center cursor-pointer transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent rounded-full"
        style={{
          transform: selected ? 'scale(1.2)' : isHovered ? 'scale(1.08)' : undefined,
          transitionTimingFunction: 'var(--ev-ease)',
        }}
      >
        {/* Hover Tooltip (Desktop) */}
        {isHovered && !selected && (
          <div className="absolute bottom-[calc(100%+8px)] z-50 pointer-events-none whitespace-nowrap rounded-[12px] bg-ev-ink px-2.5 py-2 text-white shadow-ev transition-opacity duration-150 animate-in fade-in">
            <div className="text-xs font-semibold leading-tight">{station.name}</div>
            <div className="font-mono text-[11px] text-ev-ink3 leading-tight mt-0.5">
              {station.freeChargers} free · {waitText}
            </div>
          </div>
        )}

        {/* Selected Pulse Ring */}
        {selected && (
          <span className="absolute -top-1 h-12 w-12 animate-ping rounded-full bg-ev-accent/30 motion-reduce:hidden pointer-events-none" />
        )}

        {/* Pin Main Circle */}
        <div
          className="relative flex h-10 w-10 items-center justify-center rounded-full shadow-pin transition-all"
          style={{
            background: COLOR[station.status],
            border: `${selected ? 3 : 2}px solid ${selected ? 'var(--ev-accent)' : '#fff'}`,
          }}
        >
          <Lightning weight="fill" size={20} color="#fff" />
          {showBadge && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 font-mono text-[11px] font-semibold text-ev-ink shadow-pin">
              {station.freeChargers}
            </span>
          )}
        </div>

        {/* Pointer Triangle */}
        <div
          className="-mt-0.5 h-2 w-2 rotate-45"
          style={{ background: COLOR[station.status] }}
        />
      </div>
    );
  },
  (prev, next) =>
    prev.station.status === next.station.status &&
    prev.station.freeChargers === next.station.freeChargers &&
    prev.selected === next.selected &&
    prev.station.waitMin === next.station.waitMin
);

