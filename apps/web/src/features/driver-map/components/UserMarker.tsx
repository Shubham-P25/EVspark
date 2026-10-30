import React from 'react';

export function UserMarker({ heading }: { heading?: number }) {
  return (
    <div
      aria-label="Your location"
      className="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    >
      {/* 56px translucent pulse ring */}
      <span className="absolute h-14 w-14 rounded-full bg-ev-sky/20 animate-ping motion-reduce:hidden" />
      <span className="absolute h-14 w-14 rounded-full bg-ev-sky/15" />

      {/* Heading cone if available */}
      {heading != null && (
        <div
          className="absolute h-20 w-20 pointer-events-none"
          style={{
            transform: `rotate(${heading}deg)`,
          }}
        >
          <div
            className="w-full h-full opacity-30"
            style={{
              background:
                'conic-gradient(from 150deg at 50% 50%, transparent 0deg, var(--ev-sky) 30deg, transparent 60deg)',
            }}
          />
        </div>
      )}

      {/* 16px center dot */}
      <div
        className="relative h-4 w-4 rounded-full shadow-pin bg-ev-sky"
        style={{ border: '3px solid #ffffff' }}
      />
    </div>
  );
}

