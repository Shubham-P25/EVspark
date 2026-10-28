"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, Lightning, X } from "@phosphor-icons/react";
import { getOptimizedPhotoUrl } from "@/lib/station-photos";

interface HeaderProps {
  name: string;
  operatorName?: string;
  photoUrl?: string;
  pricePerKwh?: number;
  ratingAvg?: number;
  hours?: string;
  onClose: () => void;
}

export function StationCardHeader({
  name,
  operatorName = "Independent Operator",
  photoUrl,
  pricePerKwh,
  ratingAvg = 4.5,
  hours = "24/7",
  onClose,
}: HeaderProps) {
  const [imageError, setImageError] = useState(false);
  const optimizedUrl = getOptimizedPhotoUrl(photoUrl, 800);

  return (
    <div className="relative w-full border-b border-[#DADCE0]">
      {/* Close Button */}
      <button
        onClick={onClose}
        aria-label="Close station details"
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 border border-[#DADCE0] text-[#202124] shadow-sm hover:bg-[#F8F9FA] active:scale-95 transition-transform"
      >
        <X size={18} weight="bold" />
      </button>

      {/* Hero Photo Strip (3:2 Aspect Ratio) */}
      <div className="relative w-full h-44 bg-gradient-to-tr from-[#E8EAED] to-[#F1F3F4] overflow-hidden">
        {optimizedUrl && !imageError ? (
          <Image
            src={optimizedUrl}
            alt={name}
            fill
            sizes="408px"
            className="object-cover transition-opacity duration-300"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-[#5F6368]/60">
            <Lightning size={44} weight="fill" className="text-[#1A73E8]/40" />
            <span className="text-xs font-medium mt-1">EVspark Station</span>
          </div>
        )}
      </div>

      {/* Title Block */}
      <div className="p-4 space-y-1.5">
        <h2 className="text-[20px] font-semibold text-[#202124] leading-tight tracking-tight">
          {name}
        </h2>

        <p className="text-[13px] text-[#5F6368] font-medium flex items-center gap-1.5">
          <span>{operatorName}</span>
          <span>·</span>
          <span>Open {hours}</span>
        </p>

        <div className="flex items-center justify-between pt-1">
          {/* Rating */}
          <div className="flex items-center gap-1 text-[13px] text-[#202124] font-medium">
            <span className="font-bold">{ratingAvg.toFixed(1)}</span>
            <div className="flex text-[#F9AB00]">
              <Star size={14} weight="fill" />
            </div>
            <span className="text-[#5F6368] text-xs">(verified)</span>
          </div>

          {/* Pricing */}
          {pricePerKwh !== undefined && (
            <div className="text-[14px] font-mono font-semibold text-[#1E8E3E]">
              ₹{pricePerKwh.toFixed(1)} / kWh
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
