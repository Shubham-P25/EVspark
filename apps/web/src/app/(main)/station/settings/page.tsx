"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOperatorLive } from "@/lib/queries/use-operator-live";
import { Check, Image, WifiHigh, Coffee, ShieldCheck } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function StationSettingsPage() {
  const qc = useQueryClient();

  const { data: stations } = useQuery<any[]>({
    queryKey: ["operator-stations"],
    queryFn: () => api.get("/api/operator/stations"),
  });

  const [stationId, setStationId] = useState("");

  useEffect(() => {
    if (stations && stations.length > 0 && !stationId) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const { data } = useOperatorLive(stationId || undefined);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.station) {
      setName(data.station.name);
      setAddress(data.station.address || "");
    }
  }, [data]);

  const saveStation = useMutation({
    mutationFn: () =>
      api.patch(`/api/operator/stations/${stationId}/pricing`, {
        name,
        address,
      }),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Station Settings</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Station profile details, public listing, photos, and on-site driver amenities
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
            Station Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full px-3 rounded-xl border border-[#DADCE0] text-xs font-medium outline-none focus:border-[#1A73E8]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
            Physical Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-10 w-full px-3 rounded-xl border border-[#DADCE0] text-xs font-medium outline-none focus:border-[#1A73E8]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
            Operator Hotline / Support Phone
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="h-10 w-full px-3 rounded-xl border border-[#DADCE0] text-xs font-medium outline-none focus:border-[#1A73E8]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5">
            Station Photo URL (Cloudinary / CDN)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
              className="h-10 flex-1 px-3 rounded-xl border border-[#DADCE0] text-xs font-medium outline-none focus:border-[#1A73E8]"
            />
          </div>
          <p className="text-[11px] text-[#5F6368] mt-1">
            Displayed on driver station place cards and marker overlays.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
            Driver Amenities
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            {["High-speed Wi-Fi", "Restrooms", "Café / Food Court", "24/7 Security", "Covered Canopy"].map(
              (a) => (
                <label
                  key={a}
                  className="flex items-center gap-2 text-xs text-[#202124] rounded-lg border border-[#DADCE0] px-3 py-1.5 cursor-pointer hover:bg-[#F8F9FA]"
                >
                  <input type="checkbox" defaultChecked className="rounded text-[#1A73E8]" />
                  <span>{a}</span>
                </label>
              )
            )}
          </div>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E6F4EA] text-[#1E8E3E] text-xs font-semibold">
            <Check size={16} weight="bold" />
            <span>Station settings saved successfully.</span>
          </div>
        )}

        <Button
          onClick={() => saveStation.mutate()}
          disabled={saveStation.isPending}
          className="bg-[#1A73E8] hover:bg-blue-600 text-white font-semibold"
        >
          {saveStation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
