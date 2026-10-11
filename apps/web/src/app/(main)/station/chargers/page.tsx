"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOperatorLive } from "@/lib/queries/use-operator-live";
import { Lightning, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function StationChargersPage() {
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

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/operator/chargers/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
    },
  });

  const chargers = data?.chargers || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Charger Bays</h1>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Configure bay statuses, power delivery, and hardware states
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DADCE0] bg-[#F8F9FA] text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
              <th className="py-3.5 px-4">Bay Label</th>
              <th className="py-3.5 px-4">Connector</th>
              <th className="py-3.5 px-4">Power</th>
              <th className="py-3.5 px-4">Current Status</th>
              <th className="py-3.5 px-4">Active Vehicle</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADCE0] text-xs">
            {chargers.map((c) => {
              const isFree = c.status === "FREE";
              const isBusy = c.status === "BUSY";
              const isMaint = c.status === "MAINTENANCE";

              return (
                <tr key={c.id} className="hover:bg-[#F8F9FA]/50 transition">
                  <td className="py-3.5 px-4 font-semibold text-[#202124]">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-blue-50 text-[#1A73E8]">
                        <Lightning size={14} weight="fill" />
                      </div>
                      {c.label ?? "Bay"}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-md bg-[#F8F9FA] border border-[#DADCE0] px-2 py-0.5 font-medium">
                      {c.connectorType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">{c.powerKw} kW</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isFree
                          ? "bg-[#E6F4EA] text-[#1E8E3E]"
                          : isBusy
                          ? "bg-[#FEF7E0] text-[#B06000]"
                          : "bg-[#FCE8E6] text-[#D93025]"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6368]">
                    {c.activeSession ? (
                      <span>
                        <b className="text-[#202124]">{c.activeSession.vehicleModel}</b> ({c.activeSession.regMasked})
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 border-[#DADCE0]"
                      onClick={() =>
                        toggleStatus.mutate({
                          id: c.id,
                          status: isMaint ? "FREE" : "MAINTENANCE",
                        })
                      }
                    >
                      {isMaint ? "Bring Online" : "Set Maintenance"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
