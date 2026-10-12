"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { inr, num } from "@/lib/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CurrencyInr,
  Lightning,
  Car,
  Clock,
  ChartBar,
  Flame,
} from "@phosphor-icons/react";

const PIE_COLORS = ["#1A73E8", "#1E8E3E", "#F9AB00", "#D93025", "#80868B"];

export default function StationAnalyticsPage() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("7d");

  const { data: revenueData } = useQuery<any>({
    queryKey: ["operator-analytics-revenue", range],
    queryFn: () => api.get(`/api/operator/analytics/revenue?range=${range}`),
  });

  const { data: heatmapData } = useQuery<any[]>({
    queryKey: ["operator-analytics-heatmap"],
    queryFn: () => api.get("/api/operator/analytics/heatmap"),
  });

  const { data: sessionsData } = useQuery<any[]>({
    queryKey: ["operator-analytics-sessions"],
    queryFn: () => api.get("/api/operator/analytics/sessions"),
  });

  const { data: breakdownData } = useQuery<any>({
    queryKey: ["operator-analytics-breakdown"],
    queryFn: () => api.get("/api/operator/analytics/breakdown"),
  });

  const revenueByDay = revenueData?.revenueByDay ?? [];

  const connectorData = (breakdownData?.connectorSplit ?? []).map((c: any) => ({
    name: c.name,
    value: c.value,
  }));

  const waitRows = (heatmapData || []).filter((h: any) => h.avgWaitMin > 0);
  const avgWait = waitRows.length
    ? (waitRows.reduce((a: number, h: any) => a + h.avgWaitMin, 0) / waitRows.length).toFixed(1)
    : "0.0";

  const occupancyCurve = (heatmapData || []).map((h) => ({
    hour: h.hour,
    occupancy: h.occupancyPct,
    wait: h.avgWaitMin,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Station Analytics</h1>
          <p className="text-xs text-[#5F6368] mt-0.5">
            Operational telemetry, revenue yield, and capacity insights
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[#DADCE0] bg-white p-1">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                range === r
                  ? "bg-[#1A73E8] text-white"
                  : "text-[#5F6368] hover:text-[#202124]"
              }`}
            >
              {r === "7d" ? "Last 7 Days" : r === "30d" ? "Last 30 Days" : "Today"}
            </button>
          ))}
        </div>
      </div>

      {revenueData?.summary?.stationCount === 0 && (
        <p className="text-sm text-[#5F6368]">No stations yet. Add a station to see analytics.</p>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Total Revenue</span>
            <CurrencyInr size={18} className="text-[#1E8E3E]" />
          </div>
          <p className="font-mono text-2xl font-bold text-[#202124]">
            {inr(revenueData?.summary?.totalRevenue ?? 0)}
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-semibold">
            Monthly {inr(revenueData?.summary?.monthlyRevenue ?? 0)}
          </span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Total Energy</span>
            <Lightning size={18} className="text-[#1A73E8]" />
          </div>
          <p className="font-mono text-2xl font-bold text-[#202124]">
            {num((revenueData?.revenueByDay ?? []).reduce((a: number, d: any) => a + (d.kwh || 0), 0), 0)}{" "}
            <span className="text-xs font-sans text-[#5F6368]">kWh</span>
          </p>
          <span className="text-[11px] text-[#1A73E8] font-semibold">
            Uptime {revenueData?.summary?.avgUptime ?? 0}%
          </span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Total Sessions</span>
            <Car size={18} className="text-[#5F6368]" />
          </div>
          <p className="font-mono text-2xl font-bold text-[#202124]">
            {revenueData?.summary?.totalSessions ?? 0}
          </p>
          <span className="text-[11px] text-[#5F6368]">
            Avg {inr(revenueData?.summary?.avgSessionRevenue ?? 0)} / session
          </span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Avg Wait</span>
            <Clock size={18} className="text-[#F9AB00]" />
          </div>
          <p className="font-mono text-2xl font-bold text-[#202124]">
            {avgWait} <span className="text-xs font-sans text-[#5F6368]">min</span>
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-semibold">
            {revenueData?.summary?.stationCount ?? 0} active stations
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Day */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ChartBar size={18} className="text-[#1A73E8]" />
              <h2 className="text-sm font-bold text-[#202124]">Revenue & Energy Yield</h2>
            </div>
            <span className="text-[11px] font-semibold text-[#5F6368]">Daily Totals</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDay}>
                <XAxis dataKey="day" stroke="#5F6368" fontSize={11} />
                <YAxis stroke="#5F6368" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [`₹${val}`, "Revenue"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #DADCE0" }}
                />
                <Bar dataKey="revenue" fill="#1A73E8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy over 24 Hours */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-[#F9AB00]" />
              <h2 className="text-sm font-bold text-[#202124]">24-Hour Occupancy Profile</h2>
            </div>
            <span className="text-[11px] font-semibold text-[#5F6368]">Hourly Average %</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyCurve}>
                <XAxis dataKey="hour" stroke="#5F6368" fontSize={11} interval={3} />
                <YAxis stroke="#5F6368" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Occupancy"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #DADCE0" }}
                />
                <Area
                  type="monotone"
                  dataKey="occupancy"
                  stroke="#F9AB00"
                  fill="#FEF7E0"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Connector Mix Donut */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#202124] mb-4">Connector Utilization Mix</h2>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={connectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {connectorData.map((_: any, i: number) => (
                    <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs mt-2">
            {connectorData.map((d: any, i: number) => (
              <span key={d.name} className="flex items-center gap-1.5 text-[#5F6368]">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {d.name} ({d.value}%)
              </span>
            ))}
          </div>
        </div>

        {/* Recent Completed Sessions Table */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm overflow-hidden">
          <h2 className="text-sm font-bold text-[#202124] mb-3">Recent Completed Sessions</h2>
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DADCE0] text-[11px] text-[#5F6368] font-semibold uppercase">
                  <th className="pb-2">Bay</th>
                  <th className="pb-2">Energy</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DADCE0]">
                {(sessionsData || []).slice(0, 5).map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 font-semibold text-[#202124]">
                      {s.charger?.label ?? "Bay"}
                    </td>
                    <td className="py-2.5 font-mono">{num(s.energyKwh || 0, 1)} kWh</td>
                    <td className="py-2.5 font-mono font-semibold text-[#1E8E3E]">
                      {inr(s.amountInr || 0)}
                    </td>
                    <td className="py-2.5 text-[#5F6368]">
                      {new Date(s.startTs).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
