"use client";

import React from "react";
import { Lightning, CheckCircle, Warning, Clock } from "@phosphor-icons/react";

interface RecentEvent {
  ts: string;
  type: string;
  text: string;
}

export function ActivityFeed({ events }: { events: RecentEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 ring-1 ring-[#DADCE0] shadow-sm">
        <h3 className="text-sm font-bold text-[#202124] mb-3">Live Activity Feed</h3>
        <p className="text-xs text-[#5F6368] py-8 text-center">No recent events</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-[#DADCE0] shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#202124]">Live Activity Feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-[#1E8E3E] font-medium">
          <span className="size-2 rounded-full bg-[#1E8E3E] animate-pulse" />
          Realtime
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
        {events.map((ev, i) => {
          const isComplete = ev.type === "session_completed" || ev.text.includes("finished");
          const isWarning = ev.type === "fault" || ev.text.includes("offline");
          const timeStr = new Date(ev.ts).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return (
            <div
              key={`${ev.ts}-${i}`}
              className="flex items-start gap-3 p-2.5 rounded-xl border border-[#DADCE0] bg-[#F8F9FA]/60 hover:bg-[#F8F9FA] transition"
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                  isComplete
                    ? "bg-green-100 text-[#1E8E3E]"
                    : isWarning
                    ? "bg-red-100 text-[#D93025]"
                    : "bg-blue-100 text-[#1A73E8]"
                }`}
              >
                {isComplete ? (
                  <CheckCircle size={16} weight="fill" />
                ) : isWarning ? (
                  <Warning size={16} weight="fill" />
                ) : (
                  <Lightning size={16} weight="fill" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#202124] leading-snug">
                  {ev.text}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-[#5F6368] mt-1">
                  <Clock size={12} />
                  <span>{timeStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
