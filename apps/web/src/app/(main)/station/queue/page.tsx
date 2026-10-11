"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOperatorLive } from "@/lib/queries/use-operator-live";
import { UsersThree, CalendarCheck, Clock, PhoneCall, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function StationQueuePage() {
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

  const { data: bookings } = useQuery<any[]>({
    queryKey: ["operator-bookings"],
    queryFn: () => api.get("/api/bookings"),
  });

  const callQueue = useMutation({
    mutationFn: (queueId: string) => api.post(`/api/queue/${queueId}/call`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
    },
  });

  const removeQueue = useMutation({
    mutationFn: (queueId: string) => api.delete(`/api/queue/${queueId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
    },
  });

  const queue = data?.queue || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
          Queue & Bookings
        </h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Manage live arrivals and upcoming reservations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Virtual Queue */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UsersThree size={20} className="text-[#1A73E8]" />
              <h2 className="text-sm font-bold text-[#202124]">Virtual Queue ({queue.length})</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1A73E8]">
              Automated Promotion
            </span>
          </div>

          {queue.length === 0 ? (
            <p className="text-xs text-[#5F6368] py-8 text-center">No vehicles in queue.</p>
          ) : (
            <div className="space-y-3">
              {queue.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#DADCE0] bg-[#F8F9FA]/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-lg bg-[#202124] text-white font-mono text-xs font-bold">
                      #{item.position ?? idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-xs text-[#202124]">{item.vehicleRef}</p>
                      <span className="text-[11px] text-[#5F6368]">{item.connector}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-[#DADCE0] text-[#1A73E8]"
                      onClick={() => callQueue.mutate(item.id)}
                    >
                      <PhoneCall size={14} className="mr-1" /> Call
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-[#D93025]"
                      onClick={() => removeQueue.mutate(item.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookings */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck size={20} className="text-[#1E8E3E]" />
              <h2 className="text-sm font-bold text-[#202124]">
                Reserved Slots ({bookings?.length || 0})
              </h2>
            </div>
          </div>

          {!bookings || bookings.length === 0 ? (
            <p className="text-xs text-[#5F6368] py-8 text-center">No upcoming bookings for this station.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl border border-[#DADCE0] bg-[#F8F9FA]/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-[#202124]">{b.charger?.label ?? "Charger"}</p>
                    <div className="flex items-center gap-2 text-[#5F6368] mt-0.5">
                      <Clock size={12} />
                      <span>
                        {new Date(b.startTs).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(b.startTs).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#E6F4EA] text-[#1E8E3E] px-2.5 py-0.5 text-[11px] font-semibold">
                    Confirmed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
