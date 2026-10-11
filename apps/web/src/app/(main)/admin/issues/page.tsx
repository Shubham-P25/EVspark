"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WarningOctagon, CheckCircle } from "@phosphor-icons/react";

export default function AdminIssuesPage() {
  const { data: issues, isLoading } = useQuery<any[]>({
    queryKey: ["admin-issues"],
    queryFn: () => api.get("/api/admin/issues"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Reported Issues</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Driver problem reports, physical connector damage alerts, and billing dispute tickets
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#5F6368]">Loading issues...</div>
        ) : !issues || issues.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle size={36} weight="fill" className="mx-auto text-[#1E8E3E] mb-2" />
            <p className="text-sm font-bold text-[#202124]">Zero Open Tickets</p>
            <p className="text-xs text-[#5F6368] mt-1">
              No unresolved hardware or session issues reported across the network.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#DADCE0] bg-[#F8F9FA] text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
                <th className="py-3.5 px-4">Station</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DADCE0]">
              {issues.map((iss) => (
                <tr key={iss.id} className="hover:bg-[#F8F9FA]/50 transition">
                  <td className="py-3.5 px-4 font-bold text-[#202124]">
                    {iss.station?.name ?? "General"}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#1A73E8]">{iss.category ?? "Hardware"}</td>
                  <td className="py-3.5 px-4 text-[#202124]">{iss.description}</td>
                  <td className="py-3.5 px-4">
                    <span className="rounded-full bg-[#FEF7E0] text-[#B06000] px-2.5 py-0.5 text-[11px] font-semibold">
                      {iss.status ?? "OPEN"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6368]">
                    {new Date(iss.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
