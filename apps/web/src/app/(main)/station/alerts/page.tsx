"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOperatorLive } from "@/lib/queries/use-operator-live";
import { Warning, CheckCircle, ShieldWarning } from "@phosphor-icons/react";

export default function StationAlertsPage() {
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

  const chargers = data?.chargers || [];
  const faulted = chargers.filter(
    (c) => c.status === "FAULTED" || c.status === "OFFLINE" || c.status === "MAINTENANCE"
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">System Alerts</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Realtime grid overload telemetry, OCPP hardware alarms, and safety cutoffs
        </p>
      </div>

      {faulted.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-12 text-center shadow-sm">
          <CheckCircle size={36} weight="fill" className="mx-auto text-[#1E8E3E] mb-2" />
          <p className="text-sm font-bold text-[#202124]">All Station Systems Normal</p>
          <p className="text-xs text-[#5F6368] mt-1">
            0 active hardware faults, 0 grid overload warnings.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {faulted.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl bg-red-50/50 border border-red-200 p-4.5 flex items-start gap-3.5 shadow-sm"
            >
              <div className="p-2 rounded-xl bg-red-100 text-[#D93025] shrink-0 mt-0.5">
                <Warning size={20} weight="fill" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#202124]">
                    {c.label ?? "Bay"} Status Alert: {c.status}
                  </p>
                  <span className="text-[11px] font-semibold text-[#D93025] uppercase tracking-wider">
                    High Priority
                  </span>
                </div>
                <p className="text-xs text-[#5F6368] mt-1">
                  Connector {c.connectorType} ({c.powerKw} kW) has been flagged as {c.status.toLowerCase()}.
                  Please verify physical breaker and OCPP controller connection.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid Monitor info */}
      <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#202124]">
          <ShieldWarning size={16} className="text-[#1A73E8]" />
          <span>Grid Capacity & Thermal Protection</span>
        </div>
        <p className="text-xs text-[#5F6368] leading-relaxed">
          EVspark automatically balances transformer demand across bays. In the event of grid thermal surges, charging rate is throttled and notifications are broadcast to incoming drivers in the virtual queue.
        </p>
      </div>
    </div>
  );
}
