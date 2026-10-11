"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, MagnifyingGlass, IdentificationBadge } from "@phosphor-icons/react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/api/admin/users"),
  });

  const filtered = (users || []).filter((u) => {
    const name = (u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const query = search.toLowerCase();
    const matchSearch = name.includes(query) || email.includes(query);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">Platform Users</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Directory of registered drivers, certified station operators, and administrators
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-3 text-[#5F6368]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs h-10 pl-9 pr-3 rounded-xl border border-[#DADCE0] bg-white outline-none focus:border-[#1A73E8]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 text-xs px-3 rounded-xl border border-[#DADCE0] bg-white outline-none focus:border-[#1A73E8]"
        >
          <option value="all">All Roles</option>
          <option value="DRIVER">Drivers</option>
          <option value="OPERATOR">Operators</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white border border-[#DADCE0] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#DADCE0] bg-[#F8F9FA] text-[11px] font-semibold text-[#5F6368] uppercase tracking-wider">
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Onboarding Profile</th>
              <th className="py-3.5 px-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADCE0] text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#5F6368]">
                  Loading users...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#5F6368]">
                  No matching users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-[#F8F9FA]/50 transition">
                  <td className="py-3.5 px-4 font-bold text-[#202124]">
                    <div>
                      <p>{u.name || "EV User"}</p>
                      <span className="text-[11px] font-normal text-[#5F6368]">{u.email}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-700"
                          : u.role === "OPERATOR"
                          ? "bg-blue-100 text-[#1A73E8]"
                          : "bg-green-100 text-[#1E8E3E]"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6368]">
                    {u.driverProfile ? (
                      <span>
                        Reg: <b className="text-[#202124]">{u.driverProfile.vehicleRegNo || "—"}</b> ({u.driverProfile.city || "Mumbai"})
                      </span>
                    ) : u.operatorProfile ? (
                      <span>
                        Org: <b className="text-[#202124]">{u.operatorProfile.businessName || "—"}</b>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#5F6368]">
                    {new Date(u.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
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
