"use client";

import React, { useState, useEffect } from "react";
import "./ev-anim.css";

interface EvLoaderProps {
  variant?: "map" | "page" | "inline";
  message?: string;
  onRetry?: () => void;
}

const ROTATING_MESSAGES = [
  "Finding chargers near you…",
  "Checking live availability…",
  "Plugging in…",
];

export function EvLoader({
  variant = "map",
  message,
  onRetry,
}: EvLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

  useEffect(() => {
    // Rotate message every 2 seconds
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 2000);

    // After 8 seconds, trigger slow network state
    const slowTimer = setTimeout(() => {
      setIsSlowNetwork(true);
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(slowTimer);
    };
  }, []);

  const activeMessage = isSlowNetwork
    ? "Still working. Slow network?"
    : message || ROTATING_MESSAGES[msgIndex];

  // Inline variant: compact 48px battery and spinner
  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 text-xs font-medium text-[#5F6368] select-none"
      >
        <svg width="44" height="20" viewBox="0 0 44 20" fill="none">
          {/* Battery Shell */}
          <rect x="2" y="3" width="34" height="14" rx="3" stroke="#DADCE0" strokeWidth="2" fill="none" />
          <path d="M38 7V13" stroke="#DADCE0" strokeWidth="2.5" strokeLinecap="round" />
          {/* Battery Level */}
          <rect x="5" y="6" width="28" height="8" rx="1.5" fill="#1A73E8" className="animate-battery" />
        </svg>
        <span>{message || "Loading…"}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center select-none bg-[#F8F9FA] ${
        variant === "page" ? "fixed inset-0 z-50 w-screen h-screen" : "w-full h-full min-h-[280px]"
      }`}
    >
      {/* EV Driving Scene (viewBox 320x140) */}
      <svg
        width="320"
        height="140"
        viewBox="0 0 320 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full"
      >
        {/* Floating Battery Bar Above Car */}
        <g transform="translate(100, 16)">
          <rect x="0" y="0" width="56" height="12" rx="3" stroke="#DADCE0" strokeWidth="1.5" fill="#FFFFFF" />
          <path d="M57 3.5V8.5" stroke="#DADCE0" strokeWidth="2" strokeLinecap="round" />
          {/* Animated Green Fill */}
          <rect x="2" y="2" width="52" height="8" rx="1.5" fill="#1E8E3E" className="animate-battery" />
          {/* Bolt Glyph */}
          <path
            d="M29 2L25 7H29L27 10L32 6H28L29 2Z"
            fill="#FFFFFF"
            className="animate-bolt"
          />
        </g>

        {/* Dashed Road Line that scrolls left */}
        <line
          x1="0"
          y1="108"
          x2="320"
          y2="108"
          stroke="#DADCE0"
          strokeWidth="3"
          strokeDasharray="16 16"
          className="animate-road"
        />

        {/* Charger Post on the Right */}
        <g transform="translate(260, 48)">
          <rect x="0" y="0" width="18" height="60" rx="4" fill="#3C4043" />
          <rect x="4" y="6" width="10" height="8" rx="1" fill="#1A73E8" />
          {/* Charging Cable loop */}
          <path
            d="M0 32C-15 32 -18 55 -32 58"
            stroke="#5F6368"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Rounded EV Car Body (Car Bobs) */}
        <g className="animate-car">
          {/* Main Car Silhouette */}
          <path
            d="M60 92L72 68C74 64 78 62 82 62H150C156 62 162 66 166 72L178 82H192C196 82 200 86 200 90V96C200 98 198 100 196 100H64C61.8 100 60 98.2 60 96V92Z"
            fill="#1A73E8"
          />

          {/* Windows */}
          <path
            d="M85 66H115V80H75L85 66Z"
            fill="#FFFFFF"
            opacity="0.85"
          />
          <path
            d="M120 66H146C149 66 153 68 155 72L162 80H120V66Z"
            fill="#FFFFFF"
            opacity="0.85"
          />

          {/* Headlight beam */}
          <polygon points="198,90 220,86 220,98 198,96" fill="#FEE75C" opacity="0.4" />

          {/* Front Wheel */}
          <g transform="translate(162, 98)">
            <circle cx="0" cy="0" r="13" fill="#202124" />
            <circle cx="0" cy="0" r="6" fill="#DADCE0" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#202124" strokeWidth="2" className="animate-wheel" />
          </g>

          {/* Rear Wheel */}
          <g transform="translate(90, 98)">
            <circle cx="0" cy="0" r="13" fill="#202124" />
            <circle cx="0" cy="0" r="6" fill="#DADCE0" />
            <line x1="-5" y1="0" x2="5" y2="0" stroke="#202124" strokeWidth="2" className="animate-wheel" />
          </g>
        </g>
      </svg>

      {/* Rotating Feedback Message */}
      <div className="flex flex-col items-center gap-2 mt-3 text-center">
        <p className="text-[14px] font-medium text-[#202124] transition-opacity duration-200">
          {activeMessage}
        </p>

        {/* Retry link after 8 seconds */}
        {isSlowNetwork && (
          <button
            onClick={() => {
              setIsSlowNetwork(false);
              onRetry?.();
            }}
            className="text-[13px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
          >
            Retry now
          </button>
        )}
      </div>
    </div>
  );
}

export default EvLoader;
