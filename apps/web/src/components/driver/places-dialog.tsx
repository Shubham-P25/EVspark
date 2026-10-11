"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { House, Briefcase, MapPin, Check, Plus } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface PlacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "HOME" | "WORK";
  currentPlace?: { lat: number; lng: number; label: string } | null;
  onFlyTo?: (coord: { lat: number; lng: number }) => void;
}

export function PlacesDialog({
  open,
  onOpenChange,
  type,
  currentPlace,
  onFlyTo,
}: PlacesDialogProps) {
  const qc = useQueryClient();
  const [address, setAddress] = useState(currentPlace?.label || "");
  const [lat, setLat] = useState(currentPlace?.lat || 18.5204);
  const [lng, setLng] = useState(currentPlace?.lng || 73.8567);
  const [step, setStep] = useState<"edit" | "nearby_prompt">("edit");
  const [selectedNearby, setSelectedNearby] = useState<string[]>([]);

  // Fetch nearby stations for prompt
  const { data: nearbyStations = [] } = useQuery<any[]>({
    queryKey: ["nearby-for-place", lat, lng],
    queryFn: () => api<any[]>(`/api/stations/nearby?lat=${lat}&lng=${lng}&radius=5000&limit=3`),
    enabled: step === "nearby_prompt",
  });

  const savePlaceMutation = useMutation({
    mutationFn: (body: any) =>
      api("/api/me/places", {
        method: "PUT",
        json: body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile"] });
      setStep("nearby_prompt");
    },
  });

  const saveFavoritesMutation = useMutation({
    mutationFn: async (stationIds: string[]) => {
      for (const stId of stationIds) {
        await api("/api/favorites", {
          method: "POST",
          json: { stationId: stId, label: type },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites"] });
      onOpenChange(false);
      setStep("edit");
      if (onFlyTo) onFlyTo({ lat, lng });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    const payload =
      type === "HOME"
        ? { homeLat: lat, homeLng: lng, homeLabel: address.trim() }
        : { workLat: lat, workLng: lng, workLabel: address.trim() };
    savePlaceMutation.mutate(payload);
  };

  const handleFinishPrompt = () => {
    if (selectedNearby.length > 0) {
      saveFavoritesMutation.mutate(selectedNearby);
    } else {
      onOpenChange(false);
      setStep("edit");
      if (onFlyTo) onFlyTo({ lat, lng });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-[#DADCE0] text-[#202124]">
        {step === "edit" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {type === "HOME" ? (
                  <House size={24} weight="fill" className="text-[#1A73E8]" />
                ) : (
                  <Briefcase size={24} weight="fill" className="text-[#1A73E8]" />
                )}
                <DialogTitle className="text-lg font-bold">
                  Set {type === "HOME" ? "Home" : "Work"} Address
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-[#5F6368]">
                Easily find chargers and plan routes to your regular location.
              </DialogDescription>
            </DialogHeader>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#202124] mb-1">
                Location Name / Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={type === "HOME" ? "e.g. Aundh, Pune" : "e.g. Hinjewadi Tech Park"}
                className="w-full text-xs h-10 px-3 rounded-xl border border-[#DADCE0] outline-none focus:border-[#1A73E8]"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1A73E8] hover:bg-blue-600 text-white text-xs font-medium py-2 rounded-xl"
              disabled={savePlaceMutation.isPending || !address.trim()}
            >
              {savePlaceMutation.isPending ? "Saving…" : "Save Location"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#202124]">
                Add Stations Near {type === "HOME" ? "Home" : "Work"} to Favorites?
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5F6368]">
                We found {nearbyStations.length} charging stations within 5 km.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              {nearbyStations.map((st) => {
                const isSelected = selectedNearby.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#DADCE0] hover:bg-[#F8F9FA] cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#202124]">{st.name}</p>
                      <p className="text-[11px] text-[#5F6368]">
                        {st.distanceKm ?? 0} km away • {st.availableChargers ?? 0} available
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNearby([...selectedNearby, st.id]);
                        } else {
                          setSelectedNearby(selectedNearby.filter((id) => id !== st.id));
                        }
                      }}
                      className="size-4 rounded text-[#1A73E8]"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 text-xs border-[#DADCE0]"
                onClick={() => {
                  onOpenChange(false);
                  setStep("edit");
                }}
              >
                Skip
              </Button>
              <Button
                className="flex-1 bg-[#1A73E8] hover:bg-blue-600 text-white text-xs font-medium"
                onClick={handleFinishPrompt}
                disabled={saveFavoritesMutation.isPending}
              >
                {saveFavoritesMutation.isPending ? "Saving…" : "Add to Favorites"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
