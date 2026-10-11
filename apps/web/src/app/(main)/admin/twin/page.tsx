"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Cpu, Play, Pause, Warning, Check, Lightning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function AdminTwinControlsPage() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery<any>({
    queryKey: ["admin-sim-config"],
    queryFn: () => api.get("/api/admin/sim-config"),
  });

  const [speed, setSpeed] = useState(10);
  const [arrivalsPerMin, setArrivalsPerMin] = useState(0.5);
  const [surgeMultiplier, setSurgeMultiplier] = useState(2.0);
  const [running, setRunning] = useState(true);
  const [saved, setSaved] = useState(false);
  const [faultResult, setFaultResult] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setSpeed(config.speed ?? 10);
      setArrivalsPerMin(config.arrivalsPerMin ?? 0.5);
      setSurgeMultiplier(config.surgeMultiplier ?? 2.0);
      setRunning(config.running !== false);
    }
  }, [config]);

  const updateConfig = useMutation({
    mutationFn: (patch: any) => api.patch("/api/admin/sim-config", patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sim-config"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const injectFault = useMutation({
    mutationFn: () => api.post("/api/admin/inject-fault"),
    onSuccess: (res: any) => {
      setFaultResult(res.message || "Emergency fault injected successfully.");
      setTimeout(() => setFaultResult(null), 5000);
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
          Digital Twin Engine Controls
        </h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Realtime simulation clock multiplier, stochastic arrivals distribution, and fault injection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Controls */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#202124]">Simulation Status</h2>
            <Button
              size="sm"
              onClick={() => {
                const next = !running;
                setRunning(next);
                updateConfig.mutate({ running: next });
              }}
              className={`text-xs h-8 px-3 font-semibold ${
                running
                  ? "bg-[#D93025] hover:bg-red-700 text-white"
                  : "bg-[#1E8E3E] hover:bg-green-700 text-white"
              }`}
            >
              {running ? (
                <>
                  <Pause size={14} className="mr-1" /> Pause Simulation
                </>
              ) : (
                <>
                  <Play size={14} className="mr-1" /> Resume Simulation
                </>
              )}
            </Button>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-[#202124] uppercase">Clock Speed Multiplier</span>
              <span className="font-mono text-[#1A73E8]">{speed}x real-time</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              onMouseUp={() => updateConfig.mutate({ speed })}
              className="w-full accent-[#1A73E8]"
            />
            <p className="text-[11px] text-[#5F6368] mt-1">
              1 minute real-time = {speed} simulation minutes across 71 stations.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-[#202124] uppercase">Arrivals Intensity</span>
              <span className="font-mono text-[#1A73E8]">{arrivalsPerMin} / min</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={arrivalsPerMin}
              onChange={(e) => setArrivalsPerMin(Number(e.target.value))}
              onMouseUp={() => updateConfig.mutate({ arrivalsPerMin })}
              className="w-full accent-[#1A73E8]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-2">
              <span className="text-[#202124] uppercase">Surge Factor</span>
              <span className="font-mono text-[#1A73E8]">{surgeMultiplier}x</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.2"
              value={surgeMultiplier}
              onChange={(e) => setSurgeMultiplier(Number(e.target.value))}
              onMouseUp={() => updateConfig.mutate({ surgeMultiplier })}
              className="w-full accent-[#1A73E8]"
            />
          </div>

          {saved && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#E6F4EA] text-[#1E8E3E] text-xs font-semibold">
              <Check size={16} weight="bold" />
              <span>Simulation parameters updated.</span>
            </div>
          )}
        </div>

        {/* Emergency Fault Injection */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#D93025]">
              <Warning size={20} weight="fill" />
              <h2 className="text-sm font-bold text-[#202124]">Emergency Fault Simulation</h2>
            </div>
            <p className="text-xs text-[#5F6368] leading-relaxed">
              Inject an unexpected physical charger fault into a live charging session. Triggers an OCPP alarm, transitions the bay to FAULTED, and broadcasts an immediate overload delta to the network.
            </p>

            {faultResult && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#D93025] font-semibold">
                {faultResult}
              </div>
            )}
          </div>

          <Button
            onClick={() => injectFault.mutate()}
            disabled={injectFault.isPending}
            className="w-full mt-6 bg-[#D93025] hover:bg-red-700 text-white text-xs font-semibold"
          >
            {injectFault.isPending ? "Injecting..." : "Inject Emergency Fault"}
          </Button>
        </div>
      </div>
    </div>
  );
}
