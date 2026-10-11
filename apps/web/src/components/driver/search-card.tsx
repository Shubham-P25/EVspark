"use client";

import React, { useState, useEffect, useRef } from "react";
import { List, MagnifyingGlass, NavigationArrow, X, Clock, MapPin } from "@phosphor-icons/react";

interface SearchCardProps {
  onMenuClick: () => void;
  onDirectionsClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectStation?: (stationId: string) => void;
  matchingStations?: { id: string; name: string; address?: string | null }[];
}

export function SearchCard({
  onMenuClick,
  onDirectionsClick,
  searchQuery,
  onSearchChange,
  onSelectStation,
  matchingStations = [],
}: SearchCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("evspark:recent_searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 8));
      }
    } catch {
      // safe fallback
    }
  }, []);

  const saveRecent = (term: string) => {
    try {
      const updated = [term, ...recentSearches.filter((t) => t !== term)].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem("evspark:recent_searches", JSON.stringify(updated));
    } catch {
      // safe
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[400px]">
      <div className="flex items-center h-12 bg-white rounded-2xl border border-[#DADCE0] shadow-md px-3 gap-2 text-[#202124]">
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="p-1.5 rounded-full hover:bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124] transition cursor-pointer"
        >
          <List size={22} weight="bold" />
        </button>

        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search stations, places…"
            className="w-full text-sm outline-none placeholder:text-[#5F6368]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-[#5F6368] hover:text-[#202124] p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          ) : (
            <MagnifyingGlass size={18} className="text-[#5F6368]" />
          )}
        </div>

        <div className="h-6 w-px bg-[#DADCE0]" />

        <button
          type="button"
          aria-label="Directions"
          onClick={onDirectionsClick}
          className="p-2 rounded-xl text-[#1A73E8] hover:bg-blue-50 transition flex items-center gap-1 font-semibold text-xs cursor-pointer"
        >
          <NavigationArrow size={18} weight="fill" />
          <span className="hidden sm:inline">Directions</span>
        </button>
      </div>

      {/* Autocomplete / Recent Searches dropdown */}
      {isFocused && (searchQuery || recentSearches.length > 0) && (
        <div className="absolute top-14 left-0 w-full bg-white rounded-2xl border border-[#DADCE0] shadow-xl p-2 z-30 max-h-72 overflow-y-auto">
          {searchQuery && matchingStations.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#5F6368] px-2 py-1 block">
                Matching Stations
              </span>
              {matchingStations.slice(0, 5).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    saveRecent(st.name);
                    setIsFocused(false);
                    onSelectStation?.(st.id);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8F9FA] text-left text-xs text-[#202124] cursor-pointer"
                >
                  <MapPin size={16} className="text-[#1A73E8] shrink-0" />
                  <div className="overflow-hidden">
                    <p className="font-bold truncate">{st.name}</p>
                    <p className="text-[11px] text-[#5F6368] truncate">{st.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {recentSearches.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-[#DADCE0]">
              <span className="text-[10px] uppercase font-bold text-[#5F6368] px-2 py-1 block">
                Recent Searches
              </span>
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSearchChange(term);
                    setIsFocused(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8F9FA] text-left text-xs text-[#5F6368] hover:text-[#202124] cursor-pointer"
                >
                  <Clock size={16} className="shrink-0" />
                  <span className="truncate">{term}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
