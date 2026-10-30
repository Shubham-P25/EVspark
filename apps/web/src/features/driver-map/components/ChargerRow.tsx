'use client';

import React from 'react';
import { PlugsConnected } from '@phosphor-icons/react';
import { Pill } from './ui-bits';
import type { Charger } from '../types';

type Props = {
  charger: Charger;
};

export function ChargerRow({ charger }: Props) {
  const isFree = charger.state === 'free';
  const isCharging = charger.state === 'charging';
  const isOffline = charger.state === 'offline';

  const iconColor = isFree
    ? 'text-ev-free'
    : isCharging
      ? 'text-ev-busy'
      : isOffline
        ? 'text-ev-offline'
        : 'text-ev-ink2';

  return (
    <div className="flex h-16 items-center justify-between gap-3 border-b border-ev-line py-2 select-none">
      {/* 36px Connector icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ev-cardSoft border border-ev-line">
        <PlugsConnected size={18} weight="duotone" className={iconColor} />
      </div>

      {/* Middle zone: Label & Progress bar */}
      <div className="flex flex-1 flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs font-semibold text-ev-ink">{charger.label}</span>
          <span className="text-[11px] text-ev-ink3">·</span>
          <span className="text-xs text-ev-ink2">{charger.connector}</span>
          <span className="text-[11px] text-ev-ink3">·</span>
          <span className="font-mono text-xs text-ev-ink2">{charger.powerKw} kW</span>
        </div>

        {/* 8px Progress bar */}
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ev-cardSoft border border-ev-line/60">
          {isCharging && (
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${charger.progressPct ?? 50}%`,
                backgroundColor: 'var(--ev-accent)',
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 6px, transparent 6px 12px)',
                backgroundSize: '24px 24px',
                animation: 'move-stripes 2s linear infinite',
              }}
            />
          )}
          {isOffline && (
            <div
              className="h-full w-full rounded-full"
              style={{
                backgroundColor: 'var(--ev-offline)',
                opacity: 0.5,
              }}
            />
          )}
        </div>
      </div>

      {/* Right zone: Price & Remaining minutes */}
      <div className="flex shrink-0 flex-col items-end justify-center">
        <div className="flex items-center gap-1.5">
          {isFree && <Pill tone="free">Free</Pill>}
          <span className="font-mono text-xs font-semibold text-ev-ink">
            ₹{charger.pricePerKwh}/kWh
          </span>
        </div>

        <div className="font-mono text-[11px] text-ev-ink3 mt-0.5">
          {isFree ? (
            <span className="font-mono text-ev-ink3">-</span>
          ) : isCharging ? (
            `Done in ${charger.minutesLeft ?? 15} min`
          ) : isOffline ? (
            <span className="text-ev-offline">Offline</span>
          ) : (
            'Reserved'
          )}
        </div>
      </div>
    </div>
  );
}

