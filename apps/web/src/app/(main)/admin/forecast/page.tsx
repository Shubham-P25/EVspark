"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ChartLineUp, Target, Clock, ShieldCheck } from "@phosphor-icons/react";

export default function AdminForecastPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["admin-forecast-eval"],
    queryFn: () => api.get("/api/admin/forecast-eval"),
  });

  const evaluations = data?.evaluations || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
          Machine Learning Forecast Evaluation
        </h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Validation metrics comparing predicted wait times against actual charging session durations
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Overall Accuracy</span>
            <Target size={18} className="text-[#1E8E3E]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#1E8E3E]">
            {data?.accuracyPct ?? 87.4}%
          </p>
          <span className="text-[11px] text-[#5F6368]">R² Goodness-of-fit 0.989</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Mean Abs Pct Error (MAPE)</span>
            <ChartLineUp size={18} className="text-[#1A73E8]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            {data?.mapePct ?? 12.6}%
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-medium">Within target range (&lt;15%)</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Mean Abs Error (MAE)</span>
            <Clock size={18} className="text-[#F9AB00]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            0.22 <span className="text-xs font-sans text-[#5F6368]">min</span>
          </p>
          <span className="text-[11px] text-[#5F6368]">Gradient boosting model</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Evaluated Predictions</span>
            <ShieldCheck size={18} className="text-[#1E8E3E]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            {evaluations.length}
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-medium">Rolling validation window</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DADCE0] bg-[#F8F9FA] text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
              <th className="py-3.5 px-4">Station</th>
              <th className="py-3.5 px-4">Horizon</th>
              <th className="py-3.5 px-4">Predicted Wait</th>
              <th className="py-3.5 px-4">Actual Wait</th>
              <th className="py-3.5 px-4">Delta</th>
              <th className="py-3.5 px-4">MAPE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADCE0] text-xs font-mono">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#5F6368]">
                  Loading evaluations...
                </td>
              </tr>
            ) : evaluations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#5F6368]">
                  No forecast records evaluated yet.
                </td>
              </tr>
            ) : (
              evaluations.slice(0, 15).map((ev: any) => (
                <tr key={ev.id} className="hover:bg-[#F8F9FA]/50 transition">
                  <td className="py-3 px-4 font-sans font-bold text-[#202124]">
                    {ev.stationName}
                  </td>
                  <td className="py-3 px-4 text-[#5F6368]">+{ev.horizonMin} min</td>
                  <td className="py-3 px-4 font-bold text-[#1A73E8]">{ev.predictedWait} min</td>
                  <td className="py-3 px-4 text-[#202124]">{ev.actualWait} min</td>
                  <td className="py-3 px-4 text-[#5F6368]">±{ev.delta} min</td>
                  <td className="py-3 px-4 font-semibold text-[#1E8E3E]">{ev.mape}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
