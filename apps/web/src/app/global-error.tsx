"use client";

import { useEffect } from "react";
import { EvError } from "@/components/feedback/EvError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="m-0 p-0 font-sans bg-[#F8F9FA] text-[#202124]">
        <div className="flex items-center justify-center min-h-screen p-4">
          <EvError
            kind="unknown"
            onRetry={reset}
            details={error}
            className="max-w-md w-full shadow-lg border border-[#DADCE0]"
          />
        </div>
      </body>
    </html>
  );
}
