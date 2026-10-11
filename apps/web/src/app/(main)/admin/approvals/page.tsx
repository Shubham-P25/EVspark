"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle, XCircle, CheckSquare, MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function AdminApprovalsPage() {
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery<any[]>({
    queryKey: ["admin-pending-stations"],
    queryFn: () => api.get("/api/admin/stations/pending"),
  });

  const updateApproval = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.patch(`/api/admin/stations/${id}/approval`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending-stations"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
          Station Approvals Queue
        </h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Verify and approve operator-submitted charging locations before publishing to the live driver map
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#5F6368]">Loading queue...</div>
        ) : !pending || pending.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare size={36} className="mx-auto text-[#1E8E3E] mb-2" />
            <p className="text-sm font-bold text-[#202124]">Approvals Queue is Clear</p>
            <p className="text-xs text-[#5F6368] mt-1">
              All submitted stations have been approved and published.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#DADCE0] bg-[#F8F9FA] text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
                <th className="py-3.5 px-4">Station Name</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Bays</th>
                <th className="py-3.5 px-4">Submitted</th>
                <th className="py-3.5 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DADCE0] text-xs">
              {pending.map((st) => (
                <tr key={st.id} className="hover:bg-[#F8F9FA]/50 transition">
                  <td className="py-3.5 px-4 font-bold text-[#202124]">{st.name}</td>
                  <td className="py-3.5 px-4 text-[#5F6368]">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-[#1A73E8]" />
                      {st.city ?? "Maharashtra"}, {st.address ?? ""}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">
                    {st.chargers?.length ?? 0} chargers
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6368]">
                    {new Date(st.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-[#1E8E3E] hover:bg-green-700 text-white"
                        onClick={() =>
                          updateApproval.mutate({ id: st.id, status: "APPROVED" })
                        }
                      >
                        <CheckCircle size={14} className="mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-[#D93025] border-[#DADCE0] hover:bg-red-50"
                        onClick={() =>
                          updateApproval.mutate({ id: st.id, status: "REJECTED" })
                        }
                      >
                        <XCircle size={14} className="mr-1" /> Reject
                      </Button>
                    </div>
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
