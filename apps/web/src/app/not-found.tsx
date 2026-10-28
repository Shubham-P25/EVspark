"use client";

import { EvError } from "@/components/feedback/EvError";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4 bg-[#F8F9FA]">
      <EvError kind="not-found" className="max-w-md w-full shadow-sm" />
    </div>
  );
}
