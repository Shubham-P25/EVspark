'use client';

import React from 'react';
import { SlidersHorizontal } from '@phosphor-icons/react';
import { useDriverMap } from '../store';
import type { Station, Connector } from '../types';

type Props = {
  stations: Station[];
};

export function FilterChips({ stations }: Props) {
  const { filters, setFilters, panelOpen } = useDriverMap();

  // Counts for each filter
  const freeCount = stations.filter((s) => s.status === 'free').length;
  const fastCount = stations.filter((s) => (s.maxPowerKw ?? 0) >= 50).length;
  const ccs2Count = stations.filter((s) => (s.connectors ?? []).includes('CCS2')).length;
  const type2Count = stations.filter((s) => (s.connectors ?? []).includes('Type2')).length;
  const chademoCount = stations.filter((s) => (s.connectors ?? []).includes('CHAdeMO')).length;
  const cheapCount = stations.filter((s) => (s.minPrice ?? 0) <= 15).length;
  const open24hCount = stations.filter((s) => Boolean(s.open24h)).length;

  const toggleConnector = (connector: Connector) => {
    const list = filters.connectors ?? [];
    const exists = list.includes(connector);
    setFilters({
      connectors: exists ? list.filter((c) => c !== connector) : [...list, connector],
    });
  };

  const chips = [
    {
      id: 'freeNow',
      label: 'Free now',
      active: filters.freeNow,
      count: freeCount,
      dotColor: 'var(--ev-free)',
      onClick: () => setFilters({ freeNow: !filters.freeNow }),
    },
    {
      id: 'fast',
      label: 'Fast DC',
      active: filters.fast,
      count: fastCount,
      onClick: () => setFilters({ fast: !filters.fast }),
    },
    {
      id: 'ccs2',
      label: 'CCS2',
      active: (filters.connectors ?? []).includes('CCS2'),
      count: ccs2Count,
      onClick: () => toggleConnector('CCS2'),
    },
    {
      id: 'type2',
      label: 'Type 2',
      active: (filters.connectors ?? []).includes('Type2'),
      count: type2Count,
      onClick: () => toggleConnector('Type2'),
    },
    {
      id: 'chademo',
      label: 'CHAdeMO',
      active: (filters.connectors ?? []).includes('CHAdeMO'),
      count: chademoCount,
      onClick: () => toggleConnector('CHAdeMO'),
    },
    {
      id: 'cheap',
      label: 'Under ₹15/kWh',
      active: filters.maxPrice === 15,
      count: cheapCount,
      onClick: () => setFilters({ maxPrice: filters.maxPrice === 15 ? null : 15 }),
    },
    {
      id: 'favOnly',
      label: 'Favourites',
      active: filters.favOnly,
      count: stations.filter((s) => useDriverMap.getState().favourites.has(s.id)).length,
      onClick: () => setFilters({ favOnly: !filters.favOnly }),
    },
    {
      id: 'open24h',
      label: 'Open 24h',
      active: filters.open24h,
      count: open24hCount,
      onClick: () => setFilters({ open24h: !filters.open24h }),
    },
  ];

  return (
    <div
      className={`absolute top-16 lg:top-3 z-20 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-3 lg:px-0 transition-all duration-280 ${
        panelOpen ? 'lg:left-[452px]' : 'lg:left-[152px]'
      }`}
      style={{ maxWidth: 'calc(100vw - 120px)' }}
    >
      {chips.map((chip) => {
        const disabled = chip.count === 0 && !chip.active;
        return (
          <button
            key={chip.id}
            type="button"
            disabled={disabled}
            aria-disabled={disabled}
            onClick={chip.onClick}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-medium shadow-ev transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent ${
              chip.active
                ? 'bg-ev-accent text-white border-transparent'
                : disabled
                  ? 'bg-ev-card/50 text-ev-ink3 opacity-45 cursor-not-allowed border border-ev-line'
                  : 'bg-ev-card text-ev-ink border border-ev-line hover:bg-ev-cardSoft'
            }`}
          >
            {chip.dotColor && !chip.active && (
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: chip.dotColor }}
              />
            )}
            <span>{chip.label}</span>
            {chip.count > 0 && (
              <span
                className={`font-mono text-[11px] font-semibold tabular-nums ${
                  chip.active ? 'text-white/80' : 'text-ev-ink3'
                }`}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}

      {/* Advanced Filters Button */}
      <button
        type="button"
        aria-label="Filter options"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-ev-line bg-ev-card px-3 text-xs font-medium text-ev-ink shadow-ev hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
      >
        <SlidersHorizontal size={15} />
        <span>Filters</span>
      </button>
    </div>
  );
}

