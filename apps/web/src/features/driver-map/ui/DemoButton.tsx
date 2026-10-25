"use client";

import React from "react";
import { PlayCircle, StopCircle } from "@phosphor-icons/react";
import { useMapUiStore } from "../stores/map-ui-store";
import { useMapDemo } from "../../map-demo/ui/useMapDemo";
import { Spinner } from "@/components/ui/spinner";

export function DemoButton() {
  const demoOpen = useMapUiStore((s) => s.demoOpen);
  const setDemoOpen = useMapUiStore((s) => s.setDemoOpen);
  const state = useMapDemo((s) => s.state);
  const stop = useMapDemo((s) => s.stop);

  const handleClick = () => {
    if (state === "running") {
      setDemoOpen(false);
      stop();
    } else {
      setDemoOpen(true);
    }
  };

  const isRunning = state === "running";
  const isLoading = state === "loading";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isRunning ? "Stop simulation demo" : "Start simulation demo"}
      className={`h-10 px-3.5 sm:px-4 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] cursor-pointer select-none border focus:outline-none focus:ring-2 focus:ring-[#1A73E8] ${
        isRunning
          ? "bg-[#D93025] hover:bg-[#C5221F] text-white border-transparent"
          : "bg-white text-[#202124] hover:bg-[#F8F9FA] border-[#DADCE0]"
      }`}
    >
      {isLoading ? (
        <>
          <Spinner className="size-4 text-[#1A73E8]" />
          <span className="hidden sm:inline">Starting...</span>
        </>
      ) : isRunning ? (
        <>
          <StopCircle size={18} weight="fill" />
          <span>Stop demo</span>
        </>
      ) : (
        <>
          <PlayCircle size={18} weight="fill" className="text-[#1A73E8]" />
          <span>Demo</span>
        </>
      )}
    </button>
  );
}

export default DemoButton;
