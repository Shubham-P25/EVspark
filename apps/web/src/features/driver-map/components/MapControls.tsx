'use client';

import React, { useState } from 'react';
import {
  Crosshair,
  Plus,
  Minus,
  ArrowsOut,
  ArrowsIn,
  Stack,
  Fire,
} from '@phosphor-icons/react';
import { useDriverMap } from '../store';

export function MapControls() {
  const { user, mapType, setMapType, showHeat, setShowHeat, mapInstance: map } = useDriverMap();
  const [layersOpen, setLayersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLocateMe = () => {
    if (user && map) {
      map.panTo({ lat: user.lat, lng: user.lng });
      map.setZoom(15);
    } else if (navigator.geolocation && map) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        map.setZoom(15);
      });
    }
  };

  const handleZoomIn = () => {
    if (map) {
      const z = map.getZoom() ?? 13;
      map.setZoom(z + 1);
    }
  };

  const handleZoomOut = () => {
    if (map) {
      const z = map.getZoom() ?? 13;
      map.setZoom(Math.max(1, z - 1));
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col items-center gap-2 select-none">
      {/* 1. Layers Button */}
      <div className="relative">
        <button
          type="button"
          aria-label="Map layers"
          onClick={() => setLayersOpen(!layersOpen)}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-ev-line bg-ev-card text-ev-ink shadow-ev hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent ${
            layersOpen ? 'ring-2 ring-ev-accent' : ''
          }`}
        >
          <Stack size={20} weight={layersOpen ? 'fill' : 'regular'} />
        </button>

        {/* Layers Popover */}
        {layersOpen && (
          <div className="absolute right-[calc(100%+8px)] top-0 z-50 w-44 rounded-card border border-ev-line bg-ev-card p-1.5 shadow-ev animate-in fade-in-50 zoom-in-95">
            <button
              type="button"
              onClick={() => {
                setMapType('roadmap');
                setLayersOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold ${
                mapType === 'roadmap' ? 'bg-ev-cardSoft text-ev-accent' : 'text-ev-ink hover:bg-ev-cardSoft'
              }`}
            >
              <span>Default map</span>
              {mapType === 'roadmap' && <span className="h-1.5 w-1.5 rounded-full bg-ev-accent" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setMapType('satellite');
                setLayersOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold ${
                mapType === 'satellite' ? 'bg-ev-cardSoft text-ev-accent' : 'text-ev-ink hover:bg-ev-cardSoft'
              }`}
            >
              <span>Satellite</span>
              {mapType === 'satellite' && <span className="h-1.5 w-1.5 rounded-full bg-ev-accent" />}
            </button>
            <div className="my-1 border-t border-ev-line" />
            <button
              type="button"
              onClick={() => setShowHeat(!showHeat)}
              className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold text-ev-ink hover:bg-ev-cardSoft"
            >
              <div className="flex items-center gap-1.5">
                <Fire size={14} className={showHeat ? 'text-ev-accent' : 'text-ev-ink3'} />
                <span>Demand heat</span>
              </div>
              <span
                className={`h-2 w-2 rounded-full ${showHeat ? 'bg-ev-accent' : 'bg-ev-line'}`}
              />
            </button>
          </div>
        )}
      </div>

      {/* 2. Locate Me */}
      <button
        type="button"
        aria-label="Locate my position"
        onClick={handleLocateMe}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-ev-line bg-ev-card text-ev-ink shadow-ev hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
      >
        <Crosshair size={20} className={user ? 'text-ev-accent' : 'text-ev-ink'} />
      </button>

      {/* 3. Joined Zoom Controls (44x88 pill) */}
      <div className="flex h-[88px] w-11 flex-col items-center justify-between rounded-full border border-ev-line bg-ev-card shadow-ev overflow-hidden">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={handleZoomIn}
          className="flex h-11 w-11 items-center justify-center text-ev-ink hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
        >
          <Plus size={18} />
        </button>
        <div className="h-[1px] w-6 bg-ev-line" />
        <button
          type="button"
          aria-label="Zoom out"
          onClick={handleZoomOut}
          className="flex h-11 w-11 items-center justify-center text-ev-ink hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
        >
          <Minus size={18} />
        </button>
      </div>

      {/* 4. Fullscreen Button */}
      <button
        type="button"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        onClick={toggleFullscreen}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-ev-line bg-ev-card text-ev-ink shadow-ev hover:bg-ev-cardSoft active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
      >
        {isFullscreen ? <ArrowsIn size={18} /> : <ArrowsOut size={18} />}
      </button>
    </div>
  );
}

