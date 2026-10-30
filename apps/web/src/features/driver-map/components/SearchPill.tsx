'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlass, Lightning, ClockCounterClockwise, X } from '@phosphor-icons/react';
import { useDriverMap } from '../store';
import type { Station } from '../types';

export function SearchPill({ stations }: { stations: Station[] }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectStation = useDriverMap((s) => s.select);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered station results (max 6)
  const matches = query.trim()
    ? stations
        .filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.address.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const handleSelect = (station: Station) => {
    selectStation(station.id);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (!isOpen || matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + matches.length) % matches.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[selectedIndex]) {
        handleSelect(matches[selectedIndex]);
      }
    }
  };

  return (
    <div className="absolute top-3 left-3 right-3 lg:right-auto lg:left-[88px] lg:w-[352px] z-30 select-none">
      {/* Pill Search Input */}
      <div className="relative flex h-11 w-full items-center rounded-full border border-ev-line bg-ev-card px-3.5 shadow-ev transition-all focus-within:ring-2 focus-within:ring-ev-accent">
        <MagnifyingGlass size={18} className="text-ev-ink3 shrink-0 mr-2.5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDownInput}
          placeholder="Search stations or places"
          className="w-full bg-transparent text-sm text-ev-ink placeholder:text-ev-ink3 outline-none"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 text-ev-ink3 hover:text-ev-ink"
          >
            <X size={14} />
          </button>
        ) : (
          <span className="hidden lg:inline-flex items-center rounded-[8px] bg-ev-cardSoft px-1.5 py-0.5 font-mono text-[11px] font-medium text-ev-ink3 border border-ev-line/60">
            ⌘K
          </span>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-[calc(100%+8px)] overflow-hidden rounded-card border border-ev-line bg-ev-card p-1.5 shadow-ev animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {matches.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {matches.map((station, i) => (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => handleSelect(station)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm transition-colors ${
                    i === selectedIndex
                      ? 'bg-ev-cardSoft text-ev-ink'
                      : 'text-ev-ink2 hover:bg-ev-cardSoft hover:text-ev-ink'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ev-accentSoft text-ev-accent">
                      <Lightning size={15} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ev-ink leading-tight text-xs">
                        {station.name}
                      </div>
                      <div className="truncate text-[11px] text-ev-ink3 leading-tight mt-0.5">
                        {station.address}
                      </div>
                    </div>
                  </div>
                  {station.distanceKm != null && (
                    <span className="shrink-0 font-mono text-[11px] text-ev-ink3 pl-2">
                      {station.distanceKm.toFixed(1)} km
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-ev-ink3">
              No stations match your search
            </div>
          )}
        </div>
      )}
    </div>
  );
}

