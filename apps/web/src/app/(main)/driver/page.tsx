"use client";

import dynamic from "next/dynamic";

const MapShell = dynamic(
  () => import("@/components/driver/map-shell").then((mod) => mod.MapShell),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-screen w-screen place-items-center bg-[#F8F9FA] text-[#5F6368] text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 rounded-full border-2 border-[#1A73E8] border-t-transparent animate-spin" />
          <span>Loading EVspark Map…</span>
        </div>
      </div>
    ),
  }
);

export default function DriverPage() {
  return <MapShell />;
}
