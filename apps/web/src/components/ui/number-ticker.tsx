"use client";

import { useEffect, useRef, useState } from "react";

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  decimalPlaces = 0,
  className = "",
}: {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(direction === "down" ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500; // ms

    const startVal = direction === "down" ? value : 0;
    const endVal = value;

    let frameId: number;
    const timeoutId = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // ease-out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = startVal + (endVal - startVal) * ease;
        setDisplayValue(current);

        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };
      frameId = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      clearTimeout(timeoutId);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, direction, delay]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`}>
      {formatted}
    </span>
  );
}
