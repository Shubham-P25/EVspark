import type React from 'react';

// Pill: tinted status label
export function Pill({
  tone,
  children,
}: {
  tone: 'free' | 'busy' | 'full' | 'accent' | 'sky' | 'neutral';
  children: React.ReactNode;
}) {
  const map = {
    free: 'bg-ev-freeSoft text-ev-free',
    busy: 'bg-ev-busySoft text-[#a86a00]',
    full: 'bg-ev-fullSoft text-ev-full',
    accent: 'bg-ev-accentSoft text-ev-accent',
    sky: 'bg-ev-skySoft text-ev-sky',
    neutral: 'bg-ev-soft text-ev-ink2',
  } as const;
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

// Card: floating surface
export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-card border border-ev-line bg-ev-card shadow-ev ${className}`}>
      {children}
    </div>
  );
}

// Num: tabular mono number
export function Num({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-mono tabular-nums tracking-[-0.02em] ${className}`}>
      {children}
    </span>
  );
}

