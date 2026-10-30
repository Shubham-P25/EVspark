'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lightning,
  MapTrifold,
  Heart,
  ClockCounterClockwise,
  Car,
  Gear,
  User,
} from '@phosphor-icons/react';
import { useDriverMap } from '../store';

type NavItem = {
  id: 'map' | 'saved' | 'trips' | 'vehicle' | 'settings' | 'me';
  label: string;
  icon: React.ElementType;
};

const MAIN_ITEMS: NavItem[] = [
  { id: 'map', label: 'Map', icon: MapTrifold },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'trips', label: 'Trips', icon: ClockCounterClockwise },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
];

const MOBILE_ITEMS: NavItem[] = [
  { id: 'map', label: 'Map', icon: MapTrifold },
  { id: 'saved', label: 'Saved', icon: Heart },
  { id: 'trips', label: 'Trips', icon: ClockCounterClockwise },
  { id: 'me', label: 'Me', icon: User },
];

export function Dock() {
  const [activeTab, setActiveTab] = useState<'map' | 'saved' | 'trips' | 'vehicle' | 'settings' | 'me'>('map');
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const setTab = useDriverMap((s) => s.setTab);

  const handleSelect = (id: typeof activeTab) => {
    setActiveTab(id);
    if (id === 'saved') {
      setTab('saved');
    } else if (id === 'map') {
      setTab('all');
    }
  };

  return (
    <>
      {/* Desktop Vertical Dock */}
      <nav
        aria-label="Primary"
        className="hidden lg:flex absolute left-3 top-3 bottom-3 w-16 z-30 flex-col items-center justify-between rounded-card border border-ev-line bg-ev-card py-3 shadow-ev select-none"
      >
        {/* Top: Logo Bolt */}
        <div className="flex flex-col items-center gap-2">
          <div
            aria-label="EVspark home"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-ev-accent text-white shadow-pin"
          >
            <Lightning size={22} weight="fill" />
          </div>

          <div className="mt-2 flex flex-col items-center gap-2">
            {MAIN_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  <button
                    type="button"
                    aria-label={item.label}
                    onClick={() => handleSelect(item.id)}
                    onMouseEnter={() => setHoveredTab(item.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="dock-pill"
                        className="absolute inset-0 rounded-full bg-ev-accent shadow-pin"
                        transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      />
                    )}
                    <span className="relative z-10">
                      <Icon
                        size={22}
                        weight={isActive ? 'fill' : 'regular'}
                        className={isActive ? 'text-white' : 'text-ev-ink2 group-hover:text-ev-ink'}
                      />
                    </span>
                  </button>

                  {/* Tooltip on right */}
                  {hoveredTab === item.id && (
                    <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-[10px] bg-ev-ink px-2.5 py-1 text-xs font-medium text-white shadow-ev pointer-events-none">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom items: Settings & Me */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <button
              type="button"
              aria-label="Settings"
              onClick={() => handleSelect('settings')}
              onMouseEnter={() => setHoveredTab('settings')}
              onMouseLeave={() => setHoveredTab(null)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
            >
              {activeTab === 'settings' && (
                <motion.div
                  layoutId="dock-pill"
                  className="absolute inset-0 rounded-full bg-ev-accent shadow-pin"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10">
                <Gear
                  size={22}
                  weight={activeTab === 'settings' ? 'fill' : 'regular'}
                  className={activeTab === 'settings' ? 'text-white' : 'text-ev-ink2 hover:text-ev-ink'}
                />
              </span>
            </button>
            {hoveredTab === 'settings' && (
              <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-[10px] bg-ev-ink px-2.5 py-1 text-xs font-medium text-white shadow-ev pointer-events-none">
                Settings
              </div>
            )}
          </div>

          <div className="relative group">
            <button
              type="button"
              aria-label="Account"
              onClick={() => handleSelect('me')}
              onMouseEnter={() => setHoveredTab('me')}
              onMouseLeave={() => setHoveredTab(null)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ev-soft text-ev-ink hover:bg-ev-cardSoft border border-ev-line transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
            >
              <User size={20} weight="bold" />
            </button>
            {hoveredTab === 'me' && (
              <div className="absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-[10px] bg-ev-ink px-2.5 py-1 text-xs font-medium text-white shadow-ev pointer-events-none">
                Account
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Horizontal Bottom Dock */}
      <nav
        aria-label="Primary mobile"
        className="lg:hidden fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex h-14 items-center justify-around rounded-full border border-ev-line bg-ev-card/95 backdrop-blur-md px-4 shadow-ev"
        style={{ width: 'min(360px, calc(100vw - 32px))' }}
      >
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              onClick={() => handleSelect(item.id)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
            >
              {isActive && (
                <motion.div
                  layoutId="dock-pill-mobile"
                  className="absolute inset-0 rounded-full bg-ev-accent shadow-pin"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative z-10">
                <Icon
                  size={20}
                  weight={isActive ? 'fill' : 'regular'}
                  className={isActive ? 'text-white' : 'text-ev-ink2'}
                />
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

