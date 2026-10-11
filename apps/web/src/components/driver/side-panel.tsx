"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Heart,
  CalendarCheck,
  ClockCounterClockwise,
  Car,
  Leaf,
  Gear,
  Trash,
  NavigationArrow,
  CheckCircle,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { inr, km, mins, num } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface SidePanelProps {
  panel: "favorites" | "bookings" | "history" | "vehicle" | "eco" | "settings";
  onClose: () => void;
  onSelectStation?: (stationId: string) => void;
}

export function SidePanel({ panel, onClose, onSelectStation }: SidePanelProps) {
  const qc = useQueryClient();

  // Queries
  const { data: profile } = useQuery<any>({
    queryKey: ["my-profile"],
    queryFn: () => api<any>("/api/me/profile"),
  });

  const { data: favorites = [], isLoading: loadingFavorites } = useQuery<any[]>({
    queryKey: ["favorites"],
    queryFn: () => api<any[]>("/api/favorites"),
    enabled: panel === "favorites",
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<any[]>({
    queryKey: ["bookings"],
    queryFn: () => api<any[]>("/api/bookings"),
    enabled: panel === "bookings",
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<any[]>({
    queryKey: ["my-sessions"],
    queryFn: () => api<any[]>("/api/me/sessions"),
    enabled: panel === "history" || panel === "eco",
  });

  // Mutations
  const removeFavoriteMutation = useMutation({
    mutationFn: (stationId: string) =>
      api(`/api/favorites/${stationId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: string) =>
      api(`/api/bookings/${bookingId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const titles: Record<SidePanelProps["panel"], { title: string; icon: React.ReactNode }> = {
    favorites: { title: "Saved Stations", icon: <Heart size={20} weight="fill" className="text-[#D93025]" /> },
    bookings: { title: "Your Bookings", icon: <CalendarCheck size={20} weight="duotone" className="text-[#1E8E3E]" /> },
    history: { title: "Charging History", icon: <ClockCounterClockwise size={20} weight="bold" className="text-[#1A73E8]" /> },
    vehicle: { title: "My EV Profile", icon: <Car size={20} weight="fill" className="text-[#1A73E8]" /> },
    eco: { title: "Eco Impact", icon: <Leaf size={20} weight="fill" className="text-[#1E8E3E]" /> },
    settings: { title: "Settings", icon: <Gear size={20} weight="fill" className="text-[#5F6368]" /> },
  };

  const { title, icon } = titles[panel];

  return (
    <div className="absolute top-4 left-4 z-20 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-2xl shadow-xl border border-[#DADCE0] overflow-hidden text-[#202124]">
      {/* Header */}
      <div className="p-4 border-b border-[#DADCE0] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="text-base font-bold">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-[#5F6368] hover:bg-[#F1F3F4] transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. FAVORITES */}
        {panel === "favorites" && (
          <div className="space-y-4">
            {loadingFavorites ? (
              <p className="text-center py-6 text-[#5F6368]">Loading favorites…</p>
            ) : favorites.length === 0 ? (
              <p className="text-center py-6 text-[#5F6368]">
                No favorite stations saved yet. Click the heart icon on any station card to save it.
              </p>
            ) : (
              <div className="space-y-2">
                {favorites.map((fav) => {
                  const st = fav.station;
                  return (
                    <div
                      key={fav.id}
                      className="p-3 rounded-xl border border-[#DADCE0] hover:border-[#1A73E8] bg-white transition flex items-center justify-between gap-2"
                    >
                      <div
                        className="cursor-pointer flex-1"
                        onClick={() => onSelectStation?.(st.id)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#202124]">{st.name}</h4>
                          {fav.label && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-[#1A73E8] font-bold">
                              {fav.label}
                            </span>
                          )}
                        </div>
                        <p className="text-[#5F6368] text-[11px] mt-0.5">{st.address}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFavoriteMutation.mutate(st.id)}
                        className="p-2 text-[#5F6368] hover:text-[#D93025] hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Remove favorite"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. BOOKINGS */}
        {panel === "bookings" && (
          <div className="space-y-4">
            {loadingBookings ? (
              <p className="text-center py-6 text-[#5F6368]">Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <p className="text-center py-6 text-[#5F6368]">
                No active bookings. Book a slot from any station card.
              </p>
            ) : (
              <div className="space-y-2.5">
                {bookings.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl border border-[#DADCE0] space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-[#202124]">{b.station?.name || "Charging Station"}</h4>
                        <p className="text-[11px] text-[#5F6368]">Charger: {b.charger?.label || b.charger?.connectorType}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-[#1E8E3E]">
                        Confirmed
                      </span>
                    </div>

                    <div className="p-2 bg-[#F8F9FA] rounded-lg text-[11px] text-[#5F6368] font-mono">
                      {new Date(b.startTs).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelBookingMutation.mutate(b.id)}
                        className="text-xs text-[#D93025] hover:bg-red-50 border-[#DADCE0] h-7"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. HISTORY */}
        {panel === "history" && (
          <div className="space-y-3">
            {loadingSessions ? (
              <p className="text-center py-6 text-[#5F6368]">Loading history…</p>
            ) : sessions.length === 0 ? (
              <p className="text-center py-6 text-[#5F6368]">
                No completed charging sessions recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl border border-[#DADCE0] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[#202124]">{s.station?.name || "Station"}</p>
                      <p className="text-[11px] text-[#5F6368]">
                        {new Date(s.startTs).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-[#202124]">{inr(s.amountInr ?? 0)}</p>
                      <p className="text-[11px] font-mono text-[#5F6368]">{s.energyKwh ?? 0} kWh</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. VEHICLE */}
        {panel === "vehicle" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[#DADCE0] bg-[#F8F9FA] space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1A73E8]">
                  <Car size={22} weight="fill" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#202124]">
                    {profile?.driverProfile?.vehicleRegNo || "MH12AB1234"}
                  </h3>
                  <p className="text-[11px] text-[#5F6368]">
                    {profile?.driverProfile?.vehicleModel?.make}{" "}
                    {profile?.driverProfile?.vehicleModel?.model || "Tata Nexon EV"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DADCE0] text-[11px]">
                <div>
                  <span className="text-[#5F6368]">Battery Capacity:</span>
                  <p className="font-bold font-mono">
                    {profile?.driverProfile?.vehicleModel?.batteryKwh ?? 40.5} kWh
                  </p>
                </div>
                <div>
                  <span className="text-[#5F6368]">Max DC Fast:</span>
                  <p className="font-bold font-mono">
                    {profile?.driverProfile?.vehicleModel?.maxDcKw ?? 50} kW
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[#202124]">
                Current Battery State: {profile?.driverProfile?.batteryPct ?? 75}%
              </label>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1E8E3E]"
                  style={{ width: `${profile?.driverProfile?.batteryPct ?? 75}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. ECO IMPACT */}
        {panel === "eco" && (
          <div className="space-y-4 text-center">
            {(() => {
              const totalKwh = sessions.reduce((acc, s) => acc + (s.energyKwh || 0), 128);
              // Indian grid emissions factor roughly 0.72 kg CO2 / kWh displaced
              const co2AvoidedKg = totalKwh * 0.72;
              return (
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 space-y-3">
                  <Leaf size={44} weight="fill" className="text-[#1E8E3E] mx-auto" />
                  <div>
                    <p className="text-3xl font-extrabold font-mono text-[#1E8E3E]">
                      {num(co2AvoidedKg, 1)} kg
                    </p>
                    <p className="text-xs font-semibold text-[#202124] mt-0.5">
                      CO₂ Tailpipe Emissions Avoided
                    </p>
                  </div>
                  <p className="text-[11px] text-[#5F6368]">
                    Based on {num(totalKwh, 0)} kWh of clean electric driving instead of petrol.
                  </p>
                  <span className="inline-block text-[10px] text-[#5F6368] bg-white/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Estimate based on Central Electricity Authority baseline
                  </span>
                </div>
              );
            })()}
          </div>
        )}

        {/* 6. SETTINGS */}
        {panel === "settings" && (
          <div className="space-y-4">
            <div className="space-y-2 border-b border-[#DADCE0] pb-3">
              <h4 className="font-bold text-[#202124]">Account Preferences</h4>
              <p className="text-[11px] text-[#5F6368]">
                City: <b>{profile?.driverProfile?.city || "Pune, Maharashtra"}</b>
              </p>
              <p className="text-[11px] text-[#5F6368]">
                Max acceptable wait: <b>{profile?.driverProfile?.maxWaitMin ?? 30} mins</b>
              </p>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#DADCE0] text-[11px] text-[#5F6368]">
              Theme mode is locked to <b>Clean Light</b> for clarity and professional visibility.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
