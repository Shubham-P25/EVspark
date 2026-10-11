"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ChargingStation, MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { inr } from "@/lib/format";

export default function AdminStationsPage() {
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");

  const { data: stations, isLoading } = useQuery<any[]>({
    queryKey: ["admin-all-stations"],
    queryFn: () => api.get("/api/stations"),
  });

  const filtered = (stations || []).filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.address && s.address.toLowerCase().includes(search.toLowerCase()));
    const matchCity = filterCity === "all" || s.city === filterCity;
    return matchSearch && matchCity;
  });

  const cities = Array.from(new Set((stations || []).map((s) => s.city).filter(Boolean)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Platform Stations</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Directory of verified EV charging infrastructure registered on the network
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-[#5F6368]" />
          <input
            type="text"
            placeholder="Search stations or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs h-10 pl-9 pr-3 rounded-xl border border-[#DADCE0] bg-white outline-none focus:border-[#1A73E8]"
          />
        </div>

        <select
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
          className="h-10 text-xs px-3 rounded-xl border border-[#DADCE0] bg-white outline-none focus:border-[#1A73E8]"
        >
          <option value="all">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white border border-[#DADCE0] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DADCE0] bg-[#F8F9FA] text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
              <th className="py-3.5 px-4">Station</th>
              <th className="py-3.5 px-4">City</th>
              <th className="py-3.5 px-4">Chargers</th>
              <th className="py-3.5 px-4">Tariff</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADCE0] text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#5F6368]">
                  Loading stations...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#5F6368]">
                  No matching stations found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8F9FA]/50 transition">
                  <td className="py-3.5 px-4 font-bold text-[#202124]">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-blue-50 text-[#1A73E8]">
                        <ChargingStation size={16} weight="fill" />
                      </div>
                      <div>
                        <p>{s.name}</p>
                        <span className="text-[11px] font-normal text-[#5F6368] line-clamp-1">
                          {s.address}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6368] font-medium">{s.city ?? "Mumbai"}</td>
                  <td className="py-3.5 px-4 font-mono font-medium">
                    {s.chargers?.length ?? 0} bays
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#1E8E3E]">
                    {inr(s.pricePerKwh)}/kWh
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-[#E6F4EA] text-[#1E8E3E] px-2.5 py-0.5 text-[11px] font-semibold">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
