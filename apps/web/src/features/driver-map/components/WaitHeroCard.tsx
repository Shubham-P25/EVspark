'use client';

import React, { useEffect, useState } from 'react';
import type { StationDetail } from '../types';

type Props = {
  waitMin: number | null;
  freeCount: number;
  total: number;
  forecast?: number[];
  confidence?: 'high' | 'medium' | 'low';
  ahead?: number;
};

export const WaitHeroCard = React.memo(function WaitHeroCard({
  waitMin,
  freeCount,
  total,
  forecast = [0, 2, 5, 8, 12, 10, 6, 4, 2, 0, 0, 0],
  confidence = 'high',
  ahead = 1,
}: Props) {
  // Count-up animation for wait number
  const [displayWait, setDisplayWait] = useState(waitMin ?? 0);

  useEffect(() => {
    if (waitMin == null) return;
    const start = displayWait;
    const end = waitMin;
    const duration = 400;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      setDisplayWait(Math.round(start + (end - start) * progress));
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }, [waitMin]);

  const hasFree = freeCount > 0;

  // Build SVG path for 12 points forecast
  const width = 140;
  const height = 50;
  const maxVal = Math.max(...forecast, 15);
  const points = forecast.map((val, i) => {
    const x = (i / (forecast.length - 1)) * width;
    const y = height - (val / maxVal) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pathD = `M 0,${height} L 0,${points[0].split(',')[1]} ` +
    points.map((p) => `L ${p}`).join(' ') +
    ` L ${width},${height} Z`;
  const lineD = `M ` + points.join(' L ');

  const confidenceDots = {
    high: 3,
    medium: 2,
    low: 1,
  }[confidence];

  return (
    <div
      aria-label="Predicted charging wait time"
      className="relative flex h-[132px] w-full flex-col justify-between overflow-hidden rounded-[20px] bg-ev-accent p-4 text-white shadow-ev select-none"
    >
      {/* Top row */}
      <div className="flex items-start justify-between z-10">
        <div>
          <span className="text-xs font-medium text-white/80">Predicted wait</span>
          <div className="mt-0.5 flex items-baseline gap-1">
            {hasFree ? (
              <span className="text-[28px] font-semibold tracking-tight text-white leading-none">
                No wait
              </span>
            ) : (
              <>
                <span className="font-mono text-[44px] font-semibold tracking-[-0.04em] tabular-nums leading-none">
                  {displayWait}
                </span>
                <span className="text-sm font-medium text-white/80">min</span>
              </>
            )}
          </div>
        </div>

        {/* Forecast Mini Chart */}
        <div className="relative h-[50px] w-[140px] opacity-90">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            {/* Soft grid lines */}
            <line x1="0" y1="12" x2={width} y2="12" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 3" />
            <line x1="0" y1="34" x2={width} y2="34" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 3" />
            {/* Gradient fill area */}
            <path d={pathD} fill="rgba(255,255,255,0.2)" />
            {/* Curve stroke */}
            <path d={lineD} fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            {/* Current point */}
            <circle cx="0" cy={points[0].split(',')[1]} r="3" fill="#ffffff" />
          </svg>
        </div>
      </div>

      {/* Bottom status row */}
      <div className="flex items-center justify-between text-xs text-white/80 z-10">
        <span>
          {hasFree
            ? `${freeCount} of ${total} chargers available now`
            : `Based on ${ahead} vehicle${ahead === 1 ? '' : 's'} ahead in queue`}
        </span>

        {/* Confidence dots */}
        <div className="flex items-center gap-1" title={`Confidence: ${confidence}`}>
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
            {confidence}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map((lvl) => (
              <span
                key={lvl}
                className={`h-1.5 w-1.5 rounded-full ${
                  lvl <= confidenceDots ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

