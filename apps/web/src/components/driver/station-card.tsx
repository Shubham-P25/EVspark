"use client";

import React, { useState, useMemo, type RefObject } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  NavigationArrow,
  CalendarCheck,
  ShareNetwork,
  WarningCircle,
  Copy,
  Check,
  Star,
  MapPin,
  Clock,
  Phone,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { inr, km, mins } from "@/lib/format";
import type { LiveCharger } from "@/lib/live";
import { PredictedWait } from "./predicted-wait";
import { ChargerRow } from "./charger-row";
import { DraggableCard } from "./draggable-card";
import { BookingDialog } from "./booking-dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export interface StationDetail {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  lat: number;
  lng: number;
  pricePerKwh: number;
  hours?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  googlePlaceId?: string | null;
  amenities: string[];
  operator?: { name?: string | null; businessName?: string | null } | null;
  chargers: LiveCharger[];
  queueLength: number;
  waitMinutes: number;
  ratingAvg: number;
  ratingCount: number;
  ratingBreakdown: Record<number, number>;
  distanceKm?: number;
  driveMinutes?: number;
}

interface StationCardProps {
  stationId: string;
  onClose: () => void;
  boundsRef: RefObject<HTMLElement | null>;
  userLocation?: { lat: number; lng: number } | null;
  onStartRoute?: (st: StationDetail) => void;
  onOpenDirections?: (st: StationDetail) => void;
  userVehicleConnectors?: string[];
  userVehicleLabel?: string;
  userPhone?: string;
}

export function StationCard({
  stationId,
  onClose,
  boundsRef,
  userLocation,
  onStartRoute,
  onOpenDirections,
  userVehicleConnectors = [],
  userVehicleLabel,
  userPhone,
}: StationCardProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"chargers" | "reviews" | "about">("chargers");
  const [isCopied, setIsCopied] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Fetch full station detail
  const { data: station, dataUpdatedAt, isLoading } = useQuery<StationDetail>({
    queryKey: ["station", stationId],
    queryFn: () => api<StationDetail>(`/api/stations/${stationId}`),
    staleTime: 5000,
  });

  // Fetch photos
  const { data: photosData } = useQuery<{ photos: string[]; attributions: string[] }>({
    queryKey: ["station", stationId, "photos"],
    queryFn: () => api<{ photos: string[]; attributions: string[] }>(`/api/stations/${stationId}/photos`),
    staleTime: 60_000,
  });

  // Fetch reviews
  const { data: reviewsData, refetch: refetchReviews } = useQuery<{ reviews: any[]; nextCursor: string | null }>({
    queryKey: ["station", stationId, "reviews"],
    queryFn: () => api<{ reviews: any[]; nextCursor: string | null }>(`/api/stations/${stationId}/reviews`),
    staleTime: 10_000,
    enabled: activeTab === "reviews",
  });

  // Favorites check & toggle
  const { data: favorites = [] } = useQuery<any[]>({
    queryKey: ["favorites"],
    queryFn: () => api<any[]>("/api/favorites"),
  });
  const isFavorite = favorites.some((f) => f.stationId === stationId);

  const toggleFavoriteMutation = useMutation({
    mutationFn: () =>
      isFavorite
        ? api(`/api/favorites/${stationId}`, { method: "DELETE" })
        : api("/api/favorites", { method: "POST", json: { stationId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const availableCount = useMemo(
    () => station?.chargers.filter((c) => c.status === "FREE").length ?? 0,
    [station?.chargers]
  );

  const copyAddress = () => {
    if (station?.address) {
      navigator.clipboard.writeText(station.address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/driver?station=${stationId}`;
    navigator.clipboard.writeText(url);
    setIsShareCopied(true);
    setTimeout(() => setIsShareCopied(false), 2000);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      await api("/api/reviews", {
        method: "POST",
        json: { stationId, rating: reviewRating, comment: reviewComment.trim() },
      });
      setReviewComment("");
      refetchReviews();
      qc.invalidateQueries({ queryKey: ["station", stationId] });
    } catch {
      // handled
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading || !station) {
    return (
      <DraggableCard boundsRef={boundsRef} onClose={onClose}>
        <div className="p-6 text-center text-sm text-[#5F6368] space-y-3">
          <div className="size-8 rounded-full border-2 border-[#1A73E8] border-t-transparent animate-spin mx-auto" />
          <p>Loading station details…</p>
        </div>
      </DraggableCard>
    );
  }

  const photos = photosData?.photos?.length
    ? photosData.photos
    : station.photoUrl
    ? [station.photoUrl]
    : [];

  const cardContent = (
    <div className="flex flex-col text-[#202124]">
      {/* 1. Photo Carousel / Header Banner */}
      <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
        {photos.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0]}
            alt={station.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 text-[#5F6368]">
            <Lightning size={36} weight="duotone" className="text-[#1A73E8] mb-1" />
            <span className="text-xs font-medium">EV Charging Station</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-[#202124] shadow-sm border border-[#DADCE0]">
            {availableCount > 0 ? `${availableCount} available` : "All occupied"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 2. Title Row */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold leading-tight text-[#202124]">{station.name}</h2>
            <button
              type="button"
              onClick={() => toggleFavoriteMutation.mutate()}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className="p-1.5 rounded-full hover:bg-[#F1F3F4] text-[#D93025] transition cursor-pointer"
            >
              <Heart size={22} weight={isFavorite ? "fill" : "regular"} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-[#5F6368]">
            <div className="flex items-center gap-1 font-semibold text-[#202124]">
              <Star size={14} weight="fill" className="text-[#F9AB00]" />
              <span>{station.ratingAvg.toFixed(1)}</span>
              <span className="font-normal text-[#5F6368]">({station.ratingCount})</span>
            </div>
            <span>•</span>
            <span className="text-[#1E8E3E] font-medium">
              {station.hours?.toLowerCase().includes("24") ? "Open 24/7" : station.hours || "Open now"}
            </span>
            <span>•</span>
            <span className="font-mono font-medium text-[#202124]">
              {inr(station.pricePerKwh)}/kWh
            </span>
          </div>
        </div>

        {/* 3. Address & Distance */}
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F8F9FA] border border-[#DADCE0] text-xs">
          <div className="flex items-center gap-2 text-[#5F6368] overflow-hidden">
            <MapPin size={16} className="shrink-0 text-[#1A73E8]" />
            <span className="truncate">{station.address || "Maharashtra, India"}</span>
          </div>
          <button
            type="button"
            onClick={copyAddress}
            title="Copy address"
            className="shrink-0 flex items-center gap-1 text-[#1A73E8] hover:underline font-medium cursor-pointer"
          >
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
            <span>{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* 4. Predicted Wait Block (ticks every second) */}
        <PredictedWait chargers={station.chargers} queueLength={station.queueLength} />

        {/* 5. Action Row */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onStartRoute?.(station)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1A73E8] transition cursor-pointer"
          >
            <NavigationArrow size={20} weight="fill" />
            <span className="text-[11px] font-semibold">Start</span>
          </button>

          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] border border-[#DADCE0] transition cursor-pointer"
          >
            <CalendarCheck size={20} weight="duotone" className="text-[#1E8E3E]" />
            <span className="text-[11px] font-semibold">Book</span>
          </button>

          <button
            type="button"
            onClick={copyShareLink}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] border border-[#DADCE0] transition cursor-pointer"
          >
            {isShareCopied ? (
              <Check size={20} className="text-[#1E8E3E]" />
            ) : (
              <ShareNetwork size={20} weight="duotone" className="text-[#5F6368]" />
            )}
            <span className="text-[11px] font-semibold">
              {isShareCopied ? "Copied" : "Share"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDirections?.(station)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F8F9FA] hover:bg-[#E8EAED] text-[#202124] border border-[#DADCE0] transition cursor-pointer"
          >
            <Sparkle size={20} weight="duotone" className="text-[#F9AB00]" />
            <span className="text-[11px] font-semibold">Directions</span>
          </button>
        </div>

        {/* 6. Tabs: Chargers | Reviews | About */}
        <div className="border-b border-[#DADCE0] flex gap-4 text-xs font-semibold">
          {[
            { id: "chargers" as const, label: `Chargers (${station.chargers.length})` },
            { id: "reviews" as const, label: `Reviews (${station.ratingCount})` },
            { id: "about" as const, label: "About" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-[#1A73E8] text-[#1A73E8]"
                  : "border-transparent text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Chargers */}
        {activeTab === "chargers" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#5F6368] px-1">
              <span>{availableCount} of {station.chargers.length} available</span>
              <span>Live status</span>
            </div>
            <ul className="space-y-2">
              {station.chargers.map((c) => (
                <ChargerRow
                  key={c.id}
                  c={c}
                  pricePerKwh={station.pricePerKwh}
                  updatedAt={dataUpdatedAt}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Tab 2: Reviews */}
        {activeTab === "reviews" && (
          <div className="space-y-4">
            {/* Breakdown */}
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#DADCE0] flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold font-mono text-[#202124]">
                  {station.ratingAvg.toFixed(1)}
                </p>
                <div className="flex items-center text-[#F9AB00]">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={12}
                      weight={i <= Math.round(station.ratingAvg) ? "fill" : "regular"}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-[#5F6368] mt-0.5">{station.ratingCount} ratings</p>
              </div>

              <div className="space-y-1 w-32">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = station.ratingBreakdown[star] || 0;
                  const pct = station.ratingCount > 0 ? (count / station.ratingCount) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-1.5 text-[10px] text-[#5F6368]">
                      <span className="w-2">{star}</span>
                      <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#F9AB00]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-3 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Write a review form */}
            <form onSubmit={handleReviewSubmit} className="space-y-2 border-t border-[#DADCE0] pt-3">
              <label className="block text-xs font-semibold text-[#202124]">Write a Review</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewRating(s)}
                    className="text-[#F9AB00] hover:scale-110 transition cursor-pointer"
                  >
                    <Star size={18} weight={s <= reviewRating ? "fill" : "regular"} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your charging experience…"
                rows={2}
                className="w-full text-xs p-2.5 rounded-lg border border-[#DADCE0] outline-none focus:border-[#1A73E8]"
              />
              <Button
                type="submit"
                size="sm"
                className="w-full bg-[#1A73E8] hover:bg-blue-600 text-white text-xs"
                disabled={isSubmittingReview || !reviewComment.trim()}
              >
                {isSubmittingReview ? "Posting…" : "Submit Review"}
              </Button>
            </form>

            {/* Reviews list */}
            <div className="space-y-2.5">
              {reviewsData?.reviews?.map((r) => (
                <div key={r.id} className="p-2.5 rounded-lg border border-[#DADCE0] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#202124]">{r.authorName}</span>
                    <div className="flex text-[#F9AB00]">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={10} weight={i <= r.rating ? "fill" : "regular"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[#5F6368] mt-1">{r.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: About */}
        {activeTab === "about" && (
          <div className="space-y-3.5 text-xs">
            {station.amenities.length > 0 && (
              <div>
                <h4 className="font-semibold text-[#202124] mb-1.5 uppercase text-[10px] tracking-wider">
                  Amenities
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {station.amenities.map((am) => (
                    <span
                      key={am}
                      className="px-2.5 py-1 rounded-full bg-[#F1F3F4] text-[#202124] font-medium"
                    >
                      {am}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-[#DADCE0] pt-2 text-[#5F6368]">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#1A73E8]" />
                <span>Operating hours: <b>{station.hours || "24/7"}</b></span>
              </div>
              {station.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-[#1A73E8]" />
                  <a href={`tel:${station.phone}`} className="text-[#1A73E8] hover:underline">
                    {station.phone}
                  </a>
                </div>
              )}
              {station.operator?.name && (
                <div className="flex items-center gap-2">
                  <span>Operator: <b>{station.operator.name}</b></span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Booking Dialog Modal */}
      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        station={station}
        defaultPhone={userPhone}
        vehicleLabel={userVehicleLabel}
        vehicleConnectors={userVehicleConnectors}
      />
    </div>
  );

  return (
    <>
      {/* Desktop draggable card */}
      <div className="hidden md:block">
        <DraggableCard boundsRef={boundsRef} onClose={onClose}>
          {cardContent}
        </DraggableCard>
      </div>

      {/* Mobile Drawer (vaul) */}
      <div className="md:hidden">
        <Drawer open onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="max-h-[85vh] bg-white border-t border-[#DADCE0]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{station.name}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-2 pb-6">{cardContent}</div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
