"use client";

import React, { ReactNode } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";

interface MapsProviderProps {
  children: ReactNode;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const MapsProvider = ({ children }: MapsProviderProps) => {
  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={["marker"]}
      region="IN"
      language="en"
    >
      {children}
    </APIProvider>
  );
};
