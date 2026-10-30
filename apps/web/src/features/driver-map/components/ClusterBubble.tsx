import React from 'react';

export function ClusterBubble({ count }: { count: number }) {
  const size = Math.min(64, Math.max(40, 28 + Math.log2(count) * 8));
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Cluster of ${count} stations`}
      className="flex items-center justify-center rounded-full bg-white shadow-pin cursor-pointer transition-transform hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-ev-accent"
      style={{ width: size, height: size, border: '3px solid var(--ev-ink)' }}
    >
      <span className="font-mono text-sm font-semibold tabular-nums text-ev-ink">
        {count}
      </span>
    </div>
  );
}

