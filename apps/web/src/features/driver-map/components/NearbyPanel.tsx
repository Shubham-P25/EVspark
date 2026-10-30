'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretLeft,
  CaretRight,
  ListBullets,
  Funnel,
} from '@phosphor-icons/react';
import { StationListItem } from './StationListItem';
import { ListItemSkeleton } from './Skeletons';
import { EmptyState } from './EmptyStates';
import { useDriverMap } from '../store';
import type { Station } from '../types';

type Props = {
  stations: Station[];
  loading?: boolean;
  embedded?: boolean;
};

export function NearbyPanel({ stations, loading, embedded }: Props) {
  const {
    panelOpen,
    setPanelOpen,
    tab,
    setTab,
    sort,
    setSort,
    selectedId,
    select,
    hoverId,
    hover,
    favourites,
    setFilters,
  } = useDriverMap();

  const listRef = useRef<HTMLDivElement>(null);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (tab === 'free') {
      return stations.filter((s) => s.status === 'free');
    }
    if (tab === 'saved') {
      return stations.filter((s) => favourites.has(s.id));
    }
    return stations;
  }, [stations, tab, favourites]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...tabFiltered];
    if (sort === 'wait') {
      return list.sort((a, b) => (a.waitMin ?? 0) - (b.waitMin ?? 0));
    }
    if (sort === 'price') {
      return list.sort((a, b) => a.minPrice - b.minPrice);
    }
    if (sort === 'power') {
      return list.sort((a, b) => b.maxPowerKw - a.maxPowerKw);
    }
    // Default: closest
    return list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [tabFiltered, sort]);

  // Linked hover scroll: when hoverId changes from pin, scroll to item
  useEffect(() => {
    if (!hoverId || !listRef.current) return;
    const itemEl = listRef.current.querySelector(`[data-id="${hoverId}"]`);
    if (itemEl) {
      itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hoverId]);

  if (embedded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header Tabs in Mobile Sheet */}
        <div className="flex items-center justify-between border-b border-ev-line px-4 py-2.5">
          <div className="text-sm font-semibold text-ev-ink">
            Nearby stations ({sorted.length})
          </div>
          <div className="flex rounded-full bg-ev-cardSoft p-0.5 border border-ev-line">
            {(['all', 'free', 'saved'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-all ${
                  tab === t ? 'bg-ev-card text-ev-ink shadow-pin' : 'text-ev-ink2'
                }`}
              >
                {t === 'free' ? 'Free now' : t}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-ev-line/60">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : sorted.length === 0 ? (
            <EmptyState
              type={tab === 'saved' ? 'no_stations' : 'no_filters'}
              onAction={() => {
                setTab('all');
                setFilters({ freeNow: false, maxPrice: null, connectors: [] });
              }}
            />
          ) : (
            sorted.map((s) => (
              <div key={s.id} data-id={s.id}>
                <StationListItem
                  station={s}
                  selected={s.id === selectedId}
                  onSelect={() => select(s.id)}
                  onHover={(h) => hover(h ? s.id : null)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Panel Floating Container */}
      <AnimatePresence>
        {panelOpen ? (
          <motion.aside
            initial={{ x: -380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -380, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="hidden lg:flex absolute left-[88px] top-[68px] bottom-3 w-[352px] z-30 flex-col rounded-card border border-ev-line bg-ev-card shadow-ev overflow-hidden select-none"
          >
            {/* Zone 1: Header */}
            <div className="flex items-center justify-between border-b border-ev-line px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-ev-ink">Nearby stations</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ev-cardSoft px-1.5 font-mono text-[11px] font-semibold text-ev-ink2 border border-ev-line">
                  {sorted.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Sort dropdown */}
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  aria-label="Sort stations"
                  className="rounded-full bg-ev-cardSoft border border-ev-line px-2.5 py-1 text-xs font-medium text-ev-ink2 hover:text-ev-ink outline-none cursor-pointer"
                >
                  <option value="closest">Closest</option>
                  <option value="wait">Shortest wait</option>
                  <option value="price">Cheapest</option>
                  <option value="power">Fastest</option>
                </select>

                {/* Collapse button */}
                <button
                  type="button"
                  aria-label="Collapse panel"
                  onClick={() => setPanelOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ev-ink2 hover:bg-ev-cardSoft hover:text-ev-ink transition-colors"
                >
                  <CaretLeft size={16} />
                </button>
              </div>
            </div>

            {/* Zone 2: Tabs (pill segmented, 36px) */}
            <div className="border-b border-ev-line px-3 py-2">
              <div className="flex h-9 rounded-full bg-ev-cardSoft p-0.5 border border-ev-line">
                {(['all', 'free', 'saved'] as const).map((t) => {
                  const isActive = tab === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`relative flex-1 rounded-full text-xs font-medium capitalize transition-all outline-none focus-visible:ring-2 focus-visible:ring-ev-accent ${
                        isActive ? 'text-ev-ink font-semibold' : 'text-ev-ink2 hover:text-ev-ink'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="panel-tab-pill"
                          className="absolute inset-0 rounded-full bg-white shadow-pin"
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                      )}
                      <span className="relative z-10">{t === 'free' ? 'Free now' : t}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone 3: Scrollable List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)
              ) : sorted.length === 0 ? (
                <EmptyState
                  type={tab === 'saved' ? 'no_stations' : 'no_filters'}
                  onAction={() => {
                    setTab('all');
                    setFilters({ freeNow: false, maxPrice: null, connectors: [] });
                  }}
                />
              ) : (
                sorted.map((s) => (
                  <div key={s.id} data-id={s.id}>
                    <StationListItem
                      station={s}
                      selected={s.id === selectedId}
                      onSelect={() => select(s.id)}
                      onHover={(h) => hover(h ? s.id : null)}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-ev-line bg-ev-cardSoft/50 px-4 py-2 text-[11px] text-ev-ink3">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ev-free animate-pulse" />
                <span>Live availability active</span>
              </div>
              <span className="font-mono">Updated recently</span>
            </div>
          </motion.aside>
        ) : (
          /* Reopen button when collapsed */
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            type="button"
            aria-label="Open nearby stations panel"
            onClick={() => setPanelOpen(true)}
            className="hidden lg:flex absolute left-[88px] top-[68px] z-30 h-11 items-center gap-2 rounded-full border border-ev-line bg-ev-card px-4 text-xs font-semibold text-ev-ink shadow-ev hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
          >
            <ListBullets size={18} />
            <span>Stations</span>
            <CaretRight size={14} className="text-ev-ink3" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

