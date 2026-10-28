"use client";

import React, { useState } from "react";
import Link from "next/link";
import "./ev-anim.css";

export type EvErrorKind =
  | "offline"
  | "map-key"
  | "api"
  | "geolocation"
  | "not-found"
  | "unknown";

export interface EvErrorProps {
  kind?: EvErrorKind;
  onRetry?: () => void;
  details?: string | Error;
  showDetails?: boolean;
  className?: string;
}

interface ErrorConfig {
  headline: string;
  body: string;
  actionText: string;
  actionHref?: string;
}

const ERROR_CONFIGS: Record<EvErrorKind, ErrorConfig> = {
  offline: {
    headline: "You're offline",
    body: "Showing the last stations we saved.",
    actionText: "Retry",
  },
  "map-key": {
    headline: "Map couldn't load",
    body: "Check the Google Maps key, billing and allowed referrers.",
    actionText: "Retry",
  },
  api: {
    headline: "Can't reach EVspark servers",
    body: "We'll keep trying.",
    actionText: "Retry",
  },
  geolocation: {
    headline: "Location is off",
    body: "Turn on location to see chargers near you, or search a place.",
    actionText: "Allow location",
  },
  "not-found": {
    headline: "This charger isn't here",
    body: "It may have been removed.",
    actionText: "Back to map",
    actionHref: "/driver",
  },
  unknown: {
    headline: "Something went wrong",
    body: "Details below for debugging.",
    actionText: "Retry",
  },
};

export function EvError({
  kind = "unknown",
  onRetry,
  details,
  showDetails = false,
  className = "",
}: EvErrorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const config = ERROR_CONFIGS[kind] || ERROR_CONFIGS.unknown;

  const isDevOrExplicit =
    showDetails || (typeof process !== "undefined" && process.env.NODE_ENV !== "production");

  const detailString =
    typeof details === "string"
      ? details
      : details instanceof Error
      ? `${details.name}: ${details.message}\n${details.stack || ""}`
      : details
      ? JSON.stringify(details, null, 2)
      : null;

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-6 text-center select-none bg-[#F8F9FA] rounded-2xl ${className}`}
    >
      {/* Stopped Car Scene (viewBox 320x140) */}
      <svg
        width="320"
        height="140"
        viewBox="0 0 320 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full"
      >
        {/* Floating Battery Bar at 0% with Slow Red Blink */}
        <g transform="translate(100, 16)">
          <rect
            x="0"
            y="0"
            width="56"
            height="12"
            rx="3"
            stroke="#DADCE0"
            strokeWidth="1.5"
            fill="#FFFFFF"
          />
          <path d="M57 3.5V8.5" stroke="#DADCE0" strokeWidth="2" strokeLinecap="round" />
          {/* Empty Red Bar with Blinking Warning */}
          <rect
            x="2"
            y="2"
            width="6"
            height="8"
            rx="1.5"
            fill="#D93025"
            className="animate-error-blink"
          />
          {/* Warning Exclamation */}
          <text
            x="30"
            y="9.5"
            fontSize="9"
            fontWeight="bold"
            fill="#D93025"
            textAnchor="middle"
            className="animate-error-blink"
          >
            !
          </text>
        </g>

        {/* Offline "No Signal" Icon */}
        {kind === "offline" && (
          <g transform="translate(148, 38)">
            <path
              d="M-8 -6 C -3 -11, 3 -11, 8 -6"
              stroke="#D93025"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M-5 -2 C -2 -5, 2 -5, 5 -2"
              stroke="#D93025"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="0" cy="2" r="1.5" fill="#D93025" />
            <line x1="-9" y1="4" x2="9" y2="-10" stroke="#D93025" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}

        {/* Stationary Road Line (Solid/Fixed, not scrolling) */}
        <line
          x1="0"
          y1="108"
          x2="320"
          y2="108"
          stroke="#DADCE0"
          strokeWidth="3"
        />

        {/* Charger Post on the Right with Unplugged Cable lying on ground */}
        <g transform="translate(260, 48)">
          <rect x="0" y="0" width="18" height="60" rx="4" fill="#80868B" />
          <rect x="4" y="6" width="10" height="8" rx="1" fill="#D93025" />
          {/* Unplugged drooping cable resting on the ground */}
          <path
            d="M0 32 C -10 35, -20 58, -35 60 C -45 61, -55 58, -62 60"
            stroke="#80868B"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Cable plug tip disconnected */}
          <rect x="-66" y="58" width="5" height="4" rx="1" fill="#3C4043" />
        </g>

        {/* Stopped Car Body (No bob, headlights off) */}
        <g>
          {/* Main Car Silhouette in Muted Tone */}
          <path
            d="M60 92L72 68C74 64 78 62 82 62H150C156 62 162 66 166 72L178 82H192C196 82 200 86 200 90V96C200 98 198 100 196 100H64C61.8 100 60 98.2 60 96V92Z"
            fill="#5F6368"
          />

          {/* Windows */}
          <path
            d="M85 66H115V80H75L85 66Z"
            fill="#FFFFFF"
            opacity="0.8"
          />
          <path
            d="M120 66H146C149 66 153 68 155 72L162 80H120V66Z"
            fill="#FFFFFF"
            opacity="0.8"
          />

          {/* Headlight (Off) */}
          <circle cx="196" cy="92" r="3" fill="#DADCE0" />

          {/* Front Wheel (Stationary) */}
          <g transform="translate(162, 98)">
            <circle cx="0" cy="0" r="13" fill="#202124" />
            <circle cx="0" cy="0" r="6" fill="#DADCE0" />
          </g>

          {/* Rear Wheel (Stationary) */}
          <g transform="translate(90, 98)">
            <circle cx="0" cy="0" r="13" fill="#202124" />
            <circle cx="0" cy="0" r="6" fill="#DADCE0" />
          </g>
        </g>
      </svg>

      {/* Headline & Body */}
      <h3 className="mt-3 text-[17px] font-semibold text-[#202124] tracking-tight">
        {config.headline}
      </h3>
      <p className="mt-1 text-[13px] text-[#5F6368] max-w-sm">
        {config.body}
      </p>

      {/* Primary Action Button */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {config.actionHref ? (
          <Link
            href={config.actionHref}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#1A73E8] hover:bg-[#1557B0] active:scale-[0.98] rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:ring-offset-2"
          >
            {config.actionText}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#1A73E8] hover:bg-[#1557B0] active:scale-[0.98] rounded-full transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:ring-offset-2 cursor-pointer"
          >
            {config.actionText}
          </button>
        )}
      </div>

      {/* Collapsible Details in Dev or Explicit */}
      {isDevOrExplicit && detailString && (
        <div className="mt-4 w-full max-w-md text-left">
          <button
            type="button"
            onClick={() => setDetailsOpen(!detailsOpen)}
            className="text-[12px] font-medium text-[#5F6368] hover:text-[#202124] flex items-center gap-1 focus:outline-none cursor-pointer"
          >
            <span>{detailsOpen ? "Hide" : "Show"} details</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {detailsOpen && (
            <pre className="mt-2 p-3 text-[11px] font-mono bg-white border border-[#DADCE0] text-[#D93025] rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap break-all shadow-inner">
              {detailString}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default EvError;
