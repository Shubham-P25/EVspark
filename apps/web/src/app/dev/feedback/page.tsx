"use client";

import React, { useState } from "react";
import { notFound } from "next/navigation";
import { EvLoader } from "@/components/feedback/EvLoader";
import { EvError, type EvErrorKind } from "@/components/feedback/EvError";

export default function FeedbackDevPage() {
  // In production, keep this dev page inaccessible
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [activeTab, setActiveTab] = useState<"loaders" | "errors">("loaders");
  const [retryCount, setRetryCount] = useState(0);

  const errorKinds: EvErrorKind[] = [
    "offline",
    "map-key",
    "api",
    "geolocation",
    "not-found",
    "unknown",
  ];

  return (
    <main className="min-h-screen bg-[#F1F3F4] p-6 lg:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="bg-white p-6 rounded-2xl border border-[#DADCE0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#202124]">
              EV Feedback Components Design System
            </h1>
            <p className="text-sm text-[#5F6368] mt-1">
              Visual preview for EV animations, loading screens, and error handling states.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("loaders")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${
                activeTab === "loaders"
                  ? "bg-[#1A73E8] text-white shadow-sm"
                  : "bg-[#F8F9FA] text-[#5F6368] hover:bg-[#E8EAED]"
              }`}
            >
              Loaders (3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("errors")}
              className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors cursor-pointer ${
                activeTab === "errors"
                  ? "bg-[#1A73E8] text-white shadow-sm"
                  : "bg-[#F8F9FA] text-[#5F6368] hover:bg-[#E8EAED]"
              }`}
            >
              Errors (6)
            </button>
          </div>
        </header>

        {/* Loaders Section */}
        {activeTab === "loaders" && (
          <section className="space-y-6" aria-labelledby="loaders-heading">
            <h2 id="loaders-heading" className="text-lg font-semibold text-[#202124]">
              EvLoader Variants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Map Variant */}
              <div className="bg-white p-6 rounded-2xl border border-[#DADCE0] shadow-sm flex flex-col">
                <span className="text-xs font-bold text-[#1A73E8] tracking-wider uppercase mb-2">
                  Variant: map (container filling)
                </span>
                <div className="h-72 w-full border border-[#DADCE0] rounded-xl overflow-hidden relative">
                  <EvLoader variant="map" />
                </div>
              </div>

              {/* Inline Variant */}
              <div className="bg-white p-6 rounded-2xl border border-[#DADCE0] shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A73E8] tracking-wider uppercase mb-2 block">
                    Variant: inline (buttons & cards)
                  </span>
                  <div className="p-4 bg-[#F8F9FA] rounded-xl border border-[#DADCE0] space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#202124]">Card availability</span>
                      <EvLoader variant="inline" message="Checking live chargers…" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#202124]">Button loading state</span>
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-[#F1F3F4] border border-[#DADCE0] rounded-full inline-flex items-center"
                      >
                        <EvLoader variant="inline" message="Starting charge…" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Page Variant Preview Note */}
                <div className="mt-6 pt-4 border-t border-[#DADCE0]">
                  <span className="text-xs font-bold text-[#1A73E8] tracking-wider uppercase mb-1 block">
                    Variant: page
                  </span>
                  <p className="text-xs text-[#5F6368]">
                    Active on route transition via{" "}
                    <code className="text-[#1A73E8] bg-[#F1F3F4] px-1 py-0.5 rounded">
                      app/(main)/driver/loading.tsx
                    </code>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Errors Section */}
        {activeTab === "errors" && (
          <section className="space-y-6" aria-labelledby="errors-heading">
            <div className="flex items-center justify-between">
              <h2 id="errors-heading" className="text-lg font-semibold text-[#202124]">
                EvError Kinds (6 States)
              </h2>
              <span className="text-xs text-[#5F6368]">
                Retry trigger count: <strong className="text-[#202124]">{retryCount}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {errorKinds.map((kind) => (
                <div
                  key={kind}
                  className="bg-white p-4 rounded-2xl border border-[#DADCE0] shadow-sm flex flex-col justify-between"
                >
                  <span className="text-xs font-bold text-[#D93025] tracking-wider uppercase mb-2">
                    Kind: {kind}
                  </span>
                  <div className="border border-[#DADCE0] rounded-xl overflow-hidden bg-[#F8F9FA]">
                    <EvError
                      kind={kind}
                      onRetry={() => setRetryCount((c) => c + 1)}
                      details={`Sample debug info for ${kind}\nCode: ERR_MOCK_STATE\nTimestamp: ${new Date().toISOString()}`}
                      showDetails={kind === "unknown" || kind === "api"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
