'use client';

import React from 'react';
import {
  MapPinLine,
  Funnel,
  NavigationArrow,
  WifiSlash,
} from '@phosphor-icons/react';

type EmptyType = 'no_stations' | 'no_filters' | 'location_off' | 'offline';

type Props = {
  type: EmptyType;
  onAction?: () => void;
};

export function EmptyState({ type, onAction }: Props) {
  const configs = {
    no_stations: {
      icon: MapPinLine,
      title: 'No stations in this area',
      desc: 'Zoom out or pan the map to explore other electric charging corridors.',
      actionText: 'Reset view',
    },
    no_filters: {
      icon: Funnel,
      title: 'Nothing matches your filters',
      desc: 'Try removing some filters to see available fast chargers.',
      actionText: 'Reset filters',
    },
    location_off: {
      icon: NavigationArrow,
      title: 'Location is off',
      desc: 'Turn on location services to find chargers nearest to your vehicle.',
      actionText: 'Enable location',
    },
    offline: {
      icon: WifiSlash,
      title: "You're offline",
      desc: 'Showing the last saved stations cached on your device.',
      actionText: undefined,
    },
  };

  const current = configs[type];
  const Icon = current.icon;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-ev-cardSoft text-ev-ink2 border border-ev-line">
        <Icon size={24} weight="duotone" />
      </div>
      <div className="text-sm font-semibold text-ev-ink">{current.title}</div>
      <p className="mt-1 max-w-[240px] text-xs text-ev-ink2 leading-relaxed">
        {current.desc}
      </p>
      {current.actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 items-center rounded-full bg-ev-cardSoft border border-ev-line px-4 text-xs font-semibold text-ev-ink hover:bg-ev-line transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
        >
          {current.actionText}
        </button>
      )}
    </div>
  );
}

