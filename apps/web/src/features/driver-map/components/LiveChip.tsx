'use client';

import React, { useEffect, useState } from 'react';

type Props = {
  connection?: 'live' | 'reconnecting' | 'offline';
  updatedAgoSec?: number;
  freeNearby?: number;
};

export function LiveChip({
  connection = 'live',
  updatedAgoSec = 3,
  freeNearby = 12,
}: Props) {
  const [secondsAgo, setSecondsAgo] = useState(updatedAgoSec);

  useEffect(() => {
    setSecondsAgo(updatedAgoSec);
  }, [updatedAgoSec]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dotColor =
    connection === 'live'
      ? 'bg-ev-free'
      : connection === 'reconnecting'
        ? 'bg-ev-busy'
        : 'bg-ev-offline';

  const statusText =
    connection === 'live'
      ? 'Live'
      : connection === 'reconnecting'
        ? 'Reconnecting'
        : 'Offline';

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden sm:flex h-9 items-center gap-2.5 rounded-full border border-ev-line bg-ev-card px-3.5 shadow-ev select-none"
    >
      {/* Status dot */}
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotColor} ${connection === 'live' ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-semibold text-ev-ink">{statusText}</span>
      </div>

      <div className="h-3 w-[1px] bg-ev-line" />

      {/* Free count */}
      <span className="font-mono text-xs font-medium text-ev-ink2">
        {freeNearby} free nearby
      </span>

      <div className="h-3 w-[1px] bg-ev-line" />

      {/* Updated seconds */}
      <span className="font-mono text-[11px] text-ev-ink3">
        Updated {secondsAgo}s ago
      </span>
    </div>
  );
}

