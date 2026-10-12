"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  NavigationArrow,
  CalendarCheck,
  ShareNetwork,
  Copy,
  Check,
  Star,
  Clock,
  Phone,
  Lightning,
  Sparkle,
  X,
  ShieldCheck,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { inr, km } from "@/lib/format";
import type { LiveCharger } from "@/lib/live";
import { PredictedWait } from "./predicted-wait";
import { ChargerRow } from "./charger-row";
import { BookingDialog } from "./booking-dialog";
import { getStationPhotoList } from "@/lib/station-photos";
import { useGhostSimulationStore } from "@/stores/ghost-simulation-store";
import { CaretLeft, CaretRight, Car } from "@phosphor-icons/react";

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
  ratingBreakdown?: Record<number, number>;
  distanceKm?: number;
  driveMinutes?: number;
}

interface StationCardProps {
  stationId: string;
  onClose: () => void;
  boundsRef?: React.RefObject<HTMLElement | null>;
  initialStation?: any;
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
  initialStation,
  userLocation,
  onStartRoute,
  onOpenDirections,
  userVehicleConnectors = [],
  userVehicleLabel,
  userPhone,
}: StationCardProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"chargers" | "about" | "reviews">("chargers");
  const [isCopied, setIsCopied] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Fetch full station detail with initialData fallback for ZERO latency
  const { data: serverStation } = useQuery<StationDetail>({
    queryKey: ["station", stationId],
    queryFn: () => api<StationDetail>(`/api/stations/${stationId}`),
    staleTime: 5000,
  });

  // Merge initial cached station with deep server station data for instant render
  const station: StationDetail | null = useMemo(() => {
    if (serverStation) return serverStation;
    if (initialStation && initialStation.id === stationId) {
      return {
        id: initialStation.id,
        name: initialStation.name,
        address: initialStation.address || `${initialStation.city || "Mumbai"}, India`,
        city: initialStation.city || "Mumbai",
        lat: initialStation.lat,
        lng: initialStation.lng,
        pricePerKwh: initialStation.pricePerKwh || 18,
        hours: initialStation.hours || "24/7",
        phone: initialStation.phone || "+91 98765 43210",
        photoUrl: initialStation.photoUrl,
        amenities: initialStation.amenities
          ? typeof initialStation.amenities === "string"
            ? initialStation.amenities.split(",")
            : initialStation.amenities
          : ["WiFi", "Restroom", "Cafe", "Parking"],
        chargers: initialStation.chargers || [],
        queueLength: initialStation.queueLength || 0,
        waitMinutes: initialStation.waitMinutes ?? 0,
        ratingAvg: initialStation.ratingAvg || 4.7,
        ratingCount: initialStation.ratingCount || 18,
        distanceKm: initialStation.distanceKm,
      };
    }
    return null;
  }, [serverStation, initialStation, stationId]);

  // Fetch Google Place high-res photos
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

  // Favorites
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

  // Live Ghost Simulation state for real-time occupancy and queue stack
  const simOverride = useGhostSimulationStore((state) => state.stationOverrides[stationId]);
  const spawnGhostCar = useGhostSimulationStore((state) => state.spawnGhostCar);
  const stackGhostToStation = useGhostSimulationStore((state) => state.stackGhostToStation);
  const freeStationCharger = useGhostSimulationStore((state) => state.freeStationCharger);

  const fallbackAvailable = useMemo(() => {
    if (!station?.chargers?.length) return (station as any)?.availableChargers || 0;
    return station.chargers.filter((c) => c.status === "FREE").length;
  }, [station]);

  const availableCount =
    simOverride !== undefined ? simOverride.availableChargers : fallbackAvailable;
  const isFree = availableCount > 0;
  const currentWait = simOverride !== undefined ? simOverride.waitMinutes : station?.waitMinutes ?? 0;

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
      // Handled
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!station) {
    return (
      <div className="absolute right-4 top-4 bottom-4 z-30 w-96 sm:w-[420px] max-w-[calc(100vw-2rem)] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-8 text-center justify-center items-center">
        <div className="size-8 rounded-full border-2 border-[#1A73E8] border-t-transparent animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading station data…</p>
      </div>
    );
  }

  // REQUIREMENT 2: Guaranteed high-resolution station photos with multi-angle gallery
  const curatedPhotos = getStationPhotoList({
    id: station.id,
    name: station.name,
    operatorName: station.operator?.name || "",
    photoUrl: station.photoUrl,
  });

  const allPhotos = [
    ...(photosData?.photos || []),
    ...curatedPhotos.map((p) => p.url),
  ];
  // Deduplicate
  const uniquePhotos = Array.from(new Set(allPhotos));
  const activePhoto = uniquePhotos[activePhotoIdx] || uniquePhotos[0];
  const photoMeta = curatedPhotos[activePhotoIdx % curatedPhotos.length];

  return (
    <div className="absolute right-4 top-4 bottom-4 z-30 w-96 sm:w-[420px] max-w-[calc(100vw-2rem)] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in slide-in-from-right duration-250 select-none">
      {/* Top Media Gallery & Floating Controls */}
      <div className="relative h-52 w-full bg-slate-900 shrink-0 overflow-hidden group/gallery">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto}
          alt={station.name}
          className="size-full object-cover transition-all duration-500 scale-100 group-hover/gallery:scale-105"
        />

        {/* Gradient shadow for buttons overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50 pointer-events-none" />

        {/* Previous / Next Photo Buttons */}
        {uniquePhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : uniquePhotos.length - 1));
              }}
              aria-label="Previous photo"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/gallery:opacity-100 transition shadow-md cursor-pointer"
            >
              <CaretLeft size={16} weight="bold" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePhotoIdx((prev) => (prev < uniquePhotos.length - 1 ? prev + 1 : 0));
              }}
              aria-label="Next photo"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/gallery:opacity-100 transition shadow-md cursor-pointer"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </>
        )}

        {/* Photo dots indicator & caption */}
        <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-slate-200">
            <span>📷 {activePhotoIdx + 1}/{uniquePhotos.length}</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium truncate max-w-[150px]">
              {photoMeta?.tag || "DC Fast Bay"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {uniquePhotos.slice(0, 5).map((_, idx) => (
              <span
                key={idx}
                className={`size-1.5 rounded-full transition-all ${
                  idx === activePhotoIdx ? "w-4 bg-emerald-400" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Top Control Bar */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/95 backdrop-blur-md text-slate-900 shadow-md">
              {availableCount > 0 ? (
                <span className="text-emerald-600 flex items-center gap-1.5 font-extrabold">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Free Station Available ({availableCount})
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1.5 font-extrabold">
                  <span className="size-2 rounded-full bg-amber-500" />
                  All In Use • {currentWait}m Wait
                </span>
              )}
            </span>

            {typeof station.distanceKm === "number" && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white shadow-md">
                {km(station.distanceKm)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggleFavoriteMutation.mutate()}
              title={isFavorite ? "Remove favorite" : "Save station"}
              className="size-8 rounded-full bg-white/90 backdrop-blur-md text-rose-500 flex items-center justify-center shadow-md hover:bg-white transition cursor-pointer"
            >
              <Heart size={18} weight={isFavorite ? "fill" : "regular"} />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close card"
              className="size-8 rounded-full bg-white/90 backdrop-blur-md text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-md hover:bg-white transition cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Photo thumbnails indicator if multiple images */}
        {allPhotos.length > 1 && (
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-center gap-1.5">
            {allPhotos.slice(0, 5).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePhotoIdx(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  activePhotoIdx === idx ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Title & Ratings */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 leading-snug tracking-tight">
            {station.name}
          </h2>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1 font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
              <Star size={13} weight="fill" className="text-amber-500" />
              <span>{station.ratingAvg.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({station.ratingCount})</span>
            </div>

            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{inr(station.pricePerKwh)}/kWh</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-600 font-semibold">{station.hours || "24/7 Open"}</span>
          </div>

          {/* Address with copy */}
          <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-500">
            <span className="line-clamp-2 flex-1">{station.address}</span>
            <button
              type="button"
              onClick={copyAddress}
              title="Copy address"
              className="p-1 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Real-time AI Wait Component */}
        <PredictedWait
          stationId={station.id}
          chargers={station.chargers}
          queueLength={station.queueLength}
        />

        {/* Presentation & Demo Quick Triggers */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold">
            <Car size={15} weight="fill" className="text-blue-600" />
            <span>Simulate Fleet:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                spawnGhostCar({
                  id: station.id,
                  name: station.name,
                  lat: station.lat,
                  lng: station.lng,
                });
              }}
              title="Spawn a ghost car heading towards this station"
              className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] shadow-xs transition cursor-pointer"
            >
              + Send Ghost
            </button>

            <button
              type="button"
              onClick={() => stackGhostToStation(station.id)}
              title="Add a car to this station's queue (stacks +15m)"
              className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-xs transition cursor-pointer"
            >
              ⏱ Stack Queue
            </button>

            <button
              type="button"
              onClick={() => freeStationCharger(station.id)}
              title="Free up 1 charger bay"
              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs transition cursor-pointer"
            >
              ✓ Free Bay
            </button>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onStartRoute?.(station)}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
          >
            <NavigationArrow size={20} weight="fill" />
            <span className="text-[11px]">Start</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenDirections?.(station)}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold transition active:scale-95 cursor-pointer"
          >
            <Sparkle size={20} weight="duotone" className="text-amber-500" />
            <span className="text-[11px]">Directions</span>
          </button>

          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold transition active:scale-95 cursor-pointer"
          >
            <CalendarCheck size={20} weight="duotone" className="text-emerald-600" />
            <span className="text-[11px]">Book</span>
          </button>

          <button
            type="button"
            onClick={copyShareLink}
            className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold transition active:scale-95 cursor-pointer"
          >
            {isShareCopied ? (
              <Check size={20} className="text-emerald-600" />
            ) : (
              <ShareNetwork size={20} weight="duotone" className="text-slate-600" />
            )}
            <span className="text-[11px]">{isShareCopied ? "Copied" : "Share"}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex gap-5 text-xs font-bold pt-1">
          {[
            { id: "chargers" as const, label: `Chargers (${station.chargers?.length || 0})` },
            { id: "about" as const, label: "Amenities & Info" },
            { id: "reviews" as const, label: `Reviews (${station.ratingCount || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 transition border-b-2 cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Chargers List */}
        {activeTab === "chargers" && (
          <div className="space-y-2.5">
            {station.chargers?.length ? (
              station.chargers.map((c, i) => (
                <ChargerRow
                  key={c.id || i}
                  c={c}
                  pricePerKwh={station.pricePerKwh}
                  updatedAt={Date.now()}
                />
              ))
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                <Lightning size={24} className="mx-auto mb-1 text-slate-400" />
                <span>Standard Fast DC & Type 2 AC chargers supported</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: About & Amenities */}
        {activeTab === "about" && (
          <div className="space-y-4 text-xs">
            {station.amenities?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider">
                  Available Amenities
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {station.amenities.map((am) => (
                    <span
                      key={am}
                      className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-semibold"
                    >
                      {am}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5 border-t border-slate-100 pt-3 text-slate-600">
              <div className="flex items-center gap-2.5">
                <Clock size={16} className="text-blue-600 shrink-0" />
                <span>Operating hours: <b className="text-slate-900">{station.hours || "24 Hours / 7 Days"}</b></span>
              </div>

              {station.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={16} className="text-blue-600 shrink-0" />
                  <a href={`tel:${station.phone}`} className="text-blue-600 font-semibold hover:underline">
                    {station.phone}
                  </a>
                </div>
              )}

              {station.operator?.name && (
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>Network Operator: <b className="text-slate-900">{station.operator.name}</b></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Reviews */}
        {activeTab === "reviews" && (
          <div className="space-y-4 text-xs">
            {/* Submit Review */}
            <form onSubmit={handleReviewSubmit} className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Leave a rating</span>
                <div className="flex gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="cursor-pointer"
                    >
                      <Star size={18} weight={star <= reviewRating ? "fill" : "regular"} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was your charging experience here?"
                rows={2}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={isSubmittingReview || !reviewComment.trim()}
                className="w-full py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold transition cursor-pointer"
              >
                {isSubmittingReview ? "Submitting…" : "Post Review"}
              </button>
            </form>

            {/* Existing Reviews */}
            <div className="space-y-2.5">
              {(reviewsData?.reviews || []).map((r: any) => (
                <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{r.user?.name || "EV Driver"}</span>
                    <div className="flex gap-0.5 text-amber-500">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} size={11} weight={i <= r.rating ? "fill" : "regular"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">{r.comment}</p>
                </div>
              ))}
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
}
