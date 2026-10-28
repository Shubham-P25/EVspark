"use client";

import React, { useState } from "react";
import Image from "next/image";
import { StationCardConnectors } from "./Connectors";
import { MapPin, Clock, ShieldCheck, Flag, Camera } from "@phosphor-icons/react";
import { getStationPhotoList } from "@/lib/station-photos";

interface TabsProps {
  chargers?: any[];
  address?: string;
  hours?: string;
  amenities?: string;
  stationId?: string;
  station?: any;
}

export function StationCardTabs({
  chargers = [],
  address,
  hours = "24/7",
  amenities = "WiFi, Cafe, Restroom, Parking",
  stationId,
  station,
}: TabsProps) {
  const [tab, setTab] = useState<"overview" | "chargers" | "reviews" | "photos">("overview");
  const photos = getStationPhotoList(station || { id: stationId });

  return (
    <div className="w-full">
      {/* Tab Navigation Header */}
      <div className="flex border-b border-[#DADCE0] px-4">
        {(["overview", "chargers", "reviews", "photos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2.5 px-3 text-[13px] font-semibold capitalize border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-[#1A73E8] text-[#1A73E8]"
                : "border-transparent text-[#5F6368] hover:text-[#202124]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 text-[13px] text-[#202124] space-y-3">
        {tab === "overview" && (
          <div className="space-y-3">
            {address && (
              <div className="flex items-start gap-2.5">
                <MapPin size={18} className="text-[#5F6368] shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-[#5F6368] shrink-0" />
              <span>Hours: {hours}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-[#1E8E3E] shrink-0" />
              <span>Certified Fast Charging Network</span>
            </div>
            {amenities && (
              <div className="pt-2">
                <p className="font-semibold text-xs text-[#5F6368] uppercase mb-1.5">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.split(",").map((a, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-[#F1F3F4] text-[#202124] text-xs font-medium">
                      {a.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "chargers" && <StationCardConnectors chargers={chargers} />}

        {tab === "reviews" && (
          <div className="space-y-2 text-[#5F6368]">
            <p className="font-medium text-[#202124]">Driver Feedback</p>
            <p>Reliable station with fast high-power DC charging. Security and clean parking available 24/7.</p>
          </div>
        )}

        {tab === "photos" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#5F6368]">
              <span className="font-medium flex items-center gap-1.5">
                <Camera size={15} /> Station Gallery ({photos.length})
              </span>
              <span className="text-[11px] bg-[#E8F0FE] text-[#1A73E8] px-2 py-0.5 rounded-full font-medium">
                Cloud CDN Optimized
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {photos.map((p, idx) => (
                <div
                  key={idx}
                  className="group relative h-28 rounded-xl bg-[#F1F3F4] overflow-hidden border border-[#DADCE0] shadow-xs"
                >
                  <Image
                    src={p.url}
                    alt={p.caption || `Station photo ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 200px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-1.5">
                    <p className="text-[10px] text-white font-medium truncate">{p.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-[#DADCE0] flex items-center justify-between text-[#5F6368] text-xs">
          <button className="flex items-center gap-1 hover:text-[#D93025] transition-colors">
            <Flag size={14} />
            <span>Report a problem</span>
          </button>
          <span>ID: {stationId?.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  );
}
