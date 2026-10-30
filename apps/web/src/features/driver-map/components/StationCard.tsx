'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  Heart,
  Copy,
  NavigationArrow,
  Coffee,
  Toilet,
  WifiHigh,
  Storefront,
  Umbrella,
  Check,
} from '@phosphor-icons/react';
import { Pill } from './ui-bits';
import { WaitHeroCard } from './WaitHeroCard';
import { ChargerRow } from './ChargerRow';
import { StartRouteCard } from './StartRouteCard';
import { useDriverMap } from '../store';
import type { Station, Charger } from '../types';

type Props = {
  station: Station;
  embedded?: boolean;
};

// Fallback chargers when detailed fetch is loading
const MOCK_CHARGERS: Charger[] = [
  { id: 'c1', label: 'Gun A', connector: 'CCS2', powerKw: 60, pricePerKwh: 18, state: 'free', progressPct: null, minutesLeft: null },
  { id: 'c2', label: 'Gun B', connector: 'CCS2', powerKw: 60, pricePerKwh: 18, state: 'charging', progressPct: 62, minutesLeft: 14 },
  { id: 'c3', label: 'Gun C', connector: 'Type2', powerKw: 22, pricePerKwh: 14, state: 'free', progressPct: null, minutesLeft: null },
];

export function StationCard({ station, embedded }: Props) {
  const { select, favourites, toggleFav } = useDriverMap();
  const [activeTab, setActiveTab] = useState<'chargers' | 'reviews' | 'info'>('chargers');
  const [showRoute, setShowRoute] = useState(false);
  const [copied, setCopied] = useState(false);

  const isFav = favourites.has(station.id);

  const copyAddress = () => {
    navigator.clipboard.writeText(station.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusTone =
    station.status === 'free'
      ? 'free'
      : station.status === 'busy'
        ? 'busy'
        : station.status === 'full'
          ? 'full'
          : 'neutral';

  const cardContent = (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Drag Handle & Close */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          {!embedded && <div className="h-1 w-10 rounded-full bg-ev-ink3/40" />}
        </div>
        <button
          type="button"
          aria-label="Close station detail"
          onClick={() => select(null)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ev-ink3 hover:bg-ev-cardSoft hover:text-ev-ink transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Internal scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
        {/* 2. Photo Carousel */}
        <div className="relative h-40 w-full overflow-hidden rounded-[14px] bg-ev-cardSoft border border-ev-line">
          {station.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={station.photoUrl}
              alt={station.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-ev-ink3">
              Fast Charging Hub
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            <span className="h-1.5 w-4 rounded-full bg-white shadow-pin" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
          </div>
        </div>

        {/* 3. Title Row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ev-ink leading-tight">
              {station.name}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-ev-ink2">
              <span className="truncate max-w-[240px]">{station.address}</span>
              <button
                type="button"
                aria-label="Copy station address"
                onClick={copyAddress}
                className="p-1 text-ev-ink3 hover:text-ev-ink"
              >
                {copied ? <Check size={13} className="text-ev-free" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {station.rating != null && (
              <span className="flex items-center gap-1 rounded-full bg-ev-busySoft px-2 py-0.5 font-mono text-xs font-semibold text-[#a86a00]">
                <Star size={13} weight="fill" />
                {station.rating.toFixed(1)}
              </span>
            )}
            <button
              type="button"
              aria-label={isFav ? 'Remove from saved' : 'Save station'}
              onClick={() => toggleFav(station.id)}
              className="p-1.5 rounded-full text-ev-ink3 hover:text-ev-accent active:scale-90"
            >
              <Heart size={18} weight={isFav ? 'fill' : 'regular'} className={isFav ? 'text-ev-accent' : ''} />
            </button>
          </div>
        </div>

        {/* 4. Status Row */}
        <div className="flex items-center gap-2">
          <Pill tone={statusTone}>{station.freeChargers} of {station.totalChargers} free</Pill>
          {station.open24h && <Pill tone="neutral">Open 24h</Pill>}
          {station.distanceKm != null && (
            <span className="font-mono text-xs text-ev-ink2 ml-auto">
              {station.distanceKm.toFixed(1)} km · {station.driveMin ?? 5} min
            </span>
          )}
        </div>

        {/* 5. Wait Hero Card */}
        <WaitHeroCard
          waitMin={station.waitMin}
          freeCount={station.freeChargers}
          total={station.totalChargers}
          ahead={station.queueAhead || 1}
        />

        {/* 6. Tabs */}
        <div className="flex border-b border-ev-line pt-1">
          {(['chargers', 'reviews', 'info'] as const).map((tabKey) => {
            const isActive = activeTab === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`relative pb-2.5 px-3 text-xs font-semibold capitalize transition-colors ${
                  isActive ? 'text-ev-ink' : 'text-ev-ink3 hover:text-ev-ink2'
                }`}
              >
                {tabKey}
                {isActive && (
                  <motion.div
                    layoutId="station-tab-line"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-ev-accent"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 7. Tab Content */}
        {activeTab === 'chargers' && (
          <div className="divide-y divide-ev-line">
            <div className="py-1 text-xs font-medium text-ev-ink3">
              {station.freeChargers} of {station.totalChargers} points available
            </div>
            {MOCK_CHARGERS.map((charger) => (
              <ChargerRow key={charger.id} charger={charger} />
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-ev-ink">
              <span>Verified driver reviews</span>
              <button type="button" className="text-ev-accent hover:underline">
                Write a review
              </button>
            </div>
            <div className="rounded-[14px] bg-ev-cardSoft p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span>Rohan V.</span>
                <span className="font-mono text-ev-ink3">Yesterday</span>
              </div>
              <p className="text-ev-ink2 text-[11px] leading-relaxed">
                60kW CCS2 started immediately without OTP delays. Clean bay and canopy.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-ev-line">
              <span className="text-ev-ink2">Operator</span>
              <span className="font-semibold text-ev-ink">{station.operator}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-ev-line">
              <span className="text-ev-ink2">Pricing</span>
              <span className="font-mono font-semibold text-ev-ink">From ₹{station.minPrice}/kWh</span>
            </div>
            <div className="py-2">
              <span className="text-ev-ink2 block mb-2">Amenities</span>
              <div className="flex gap-3 text-ev-ink2">
                <span className="flex items-center gap-1"><Coffee size={16} /> Café</span>
                <span className="flex items-center gap-1"><Toilet size={16} /> Restroom</span>
                <span className="flex items-center gap-1"><WifiHigh size={16} /> Fast Wi-Fi</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 8. Sticky Footer */}
      <div className="border-t border-ev-line bg-ev-card p-3">
        {showRoute ? (
          <StartRouteCard station={station} onCancel={() => setShowRoute(false)} />
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={isFav ? 'Saved' : 'Save'}
              onClick={() => toggleFav(station.id)}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-ev-line bg-ev-card px-4 text-xs font-semibold text-ev-ink hover:bg-ev-cardSoft active:scale-95"
            >
              <Heart size={16} weight={isFav ? 'fill' : 'regular'} className={isFav ? 'text-ev-accent' : ''} />
              <span>{isFav ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRoute(true)}
              className="flex-1 flex h-11 items-center justify-center gap-2 rounded-full bg-ev-accent px-4 text-xs font-semibold text-white shadow-pin hover:bg-ev-accentDeep active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
            >
              <NavigationArrow size={16} weight="fill" />
              <span>Start</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return cardContent;
  }

  return (
    <motion.aside
      drag
      dragConstraints={{ top: 12, left: 12, right: 800, bottom: 400 }}
      dragMomentum={false}
      dragElastic={0.05}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      className="hidden lg:flex fixed right-16 top-3 z-40 w-[392px] max-h-[calc(100dvh-24px)] flex-col rounded-card border border-ev-line bg-ev-card shadow-ev overflow-hidden"
    >
      {cardContent}
    </motion.aside>
  );
}

