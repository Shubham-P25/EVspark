"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOperatorLive } from "@/lib/queries/use-operator-live";
import { CurrencyInr, Clock, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function StationPricingPage() {
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

  const [tariff, setTariff] = useState<number>(18.5);
  const [hours, setHours] = useState("24/7");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.station) {
      setTariff(data.station.pricePerKwh);
      setHours(data.station.hours || "24/7");
    }
  }, [data]);

  const updatePricing = useMutation({
    mutationFn: () =>
      api.patch(`/api/operator/stations/${stationId}/pricing`, {
        pricePerKwh: tariff,
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
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
          Pricing & Operational Hours
        </h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Configure per-kWh rates, peak adjustments, and public operating hours
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
            Base Charging Tariff (₹ / kWh)
          </label>
          <div className="relative max-w-xs">
            <span className="absolute left-3.5 top-2.5 text-[#5F6368] font-bold">₹</span>
            <input
              type="number"
              step="0.5"
              min="5"
              max="100"
              value={tariff}
              onChange={(e) => setTariff(Number(e.target.value))}
              className="h-10 w-full pl-8 pr-3 rounded-xl border border-[#DADCE0] font-mono text-base font-bold outline-none focus:border-[#1A73E8]"
            />
          </div>
          <p className="text-[11px] text-[#5F6368] mt-1.5">
            Applies to all active chargers at {data?.station?.name ?? "this station"}.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
            Operating Hours
          </label>
          <select
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="h-10 w-full max-w-xs rounded-xl border border-[#DADCE0] px-3 text-xs font-medium outline-none focus:border-[#1A73E8]"
          >
            <option value="24/7">Open 24/7 (Always Available)</option>
            <option value="06:00 - 22:00">06:00 AM – 10:00 PM</option>
            <option value="08:00 - 20:00">08:00 AM – 08:00 PM</option>
          </select>
        </div>

        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#E6F4EA] text-[#1E8E3E] text-xs font-semibold">
            <Check size={16} weight="bold" />
            <span>Pricing changes saved successfully and live deltas published.</span>
          </div>
        )}

        <Button
          onClick={() => updatePricing.mutate()}
          disabled={updatePricing.isPending}
          className="bg-[#1A73E8] hover:bg-blue-600 text-white font-semibold"
        >
          {updatePricing.isPending ? "Saving..." : "Save Pricing Changes"}
        </Button>
      </div>
    </div>
  );
}
