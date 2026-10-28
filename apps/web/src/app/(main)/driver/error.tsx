"use client";

import { useEffect } from "react";
import { EvError } from "@/components/feedback/EvError";

export default function DriverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Driver route error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F8F9FA] p-4">
      <EvError
        kind="api"
        onRetry={reset}
        details={error}
        className="max-w-md w-full shadow-md"
      />
    </div>
  );
}
