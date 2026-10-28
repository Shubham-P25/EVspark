import React, { Suspense } from "react";
import { EvLoader } from "@/components/feedback/EvLoader";

export const metadata = {
  title: "EVspark - Live EV Station Map",
  description: "Real-time electric vehicle charging availability across India.",
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Preconnect to Google Maps servers for < 1.5s cold load */}
      <link rel="preconnect" href="https://maps.googleapis.com" />
      <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="anonymous" />

      <Suspense fallback={<EvLoader variant="page" />}>
        {children}
      </Suspense>
    </>
  );
}
