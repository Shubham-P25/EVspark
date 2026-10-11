"use client";

import React from "react";
import { Car, Clock, PhoneCall, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface QueueItem {
  id: string;
  vehicleRef: string;
  connector: string;
  etaTs?: string | null;
  position?: number;
}

export function QueueManager({
  queue,
  onCall,
  onRemove,
}: {
  queue: QueueItem[];
  onCall: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!queue || queue.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 ring-1 ring-[#DADCE0] shadow-sm">
        <h3 className="text-sm font-bold text-[#202124] mb-3">Virtual Queue & Arrivals</h3>
        <div className="py-8 text-center">
          <Car size={32} className="mx-auto text-[#DADCE0] mb-2" />
          <p className="text-xs text-[#5F6368]">No vehicles in queue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#DADCE0] shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#202124]">Virtual Queue & Arrivals</h3>
          <p className="text-xs text-[#5F6368]">{queue.length} vehicles waiting</p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-[#1A73E8] font-semibold">
          Auto-managed
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
        {queue.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl border border-[#DADCE0] bg-[#F8F9FA]/40 hover:bg-[#F8F9FA] transition"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-7 place-items-center rounded-lg bg-[#202124] text-white font-mono text-xs font-bold">
                #{item.position ?? idx + 1}
              </span>
              <div>
                <p className="font-semibold text-xs text-[#202124]">{item.vehicleRef}</p>
                <div className="flex items-center gap-2 text-[11px] text-[#5F6368] mt-0.5">
                  <span className="rounded bg-white px-1.5 py-0.5 border border-[#DADCE0] font-medium">
                    {item.connector}
                  </span>
                  {item.etaTs && (
                    <span className="flex items-center gap-1 font-mono">
                      <Clock size={12} />
                      {new Date(item.etaTs).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-[#1A73E8] border-[#DADCE0] hover:bg-blue-50"
                onClick={() => onCall(item.id)}
              >
                <PhoneCall size={14} className="mr-1" /> Call
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-[#D93025] hover:bg-red-50"
                onClick={() => onRemove(item.id)}
              >
                <Trash size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
