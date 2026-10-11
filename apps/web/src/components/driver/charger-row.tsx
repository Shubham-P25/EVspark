"use client";

import { useNow } from "@/hooks/use-now";
import { mmss, inr } from "@/lib/format";
import { liveSoc, remainingSec, type LiveCharger } from "@/lib/live";

const STATUS: Record<LiveCharger["status"], { label: string; cls: string }> = {
  FREE: { label: "Available", cls: "bg-[#E6F4EA] text-[#1E8E3E]" },
  BUSY: { label: "Charging", cls: "bg-[#FEF7E0] text-[#B06000]" },
  FAULTED: { label: "Faulted", cls: "bg-[#FCE8E6] text-[#D93025]" },
  OFFLINE: { label: "Offline", cls: "bg-[#F1F3F4] text-[#5F6368]" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-[#F1F3F4] text-[#5F6368]" },
};

export function ChargerRow({
  c,
  pricePerKwh,
  updatedAt,
}: {
  c: LiveCharger;
  pricePerKwh: number;
  updatedAt: number;
}) {
  const now = useNow(1000);
  const st = STATUS[c.status] || STATUS.OFFLINE;
  const rem = remainingSec(c, now);
  const soc = c.activeSession ? liveSoc(c.activeSession, updatedAt, now) : null;

  return (
    <li className="rounded-xl border border-[#DADCE0] p-3 list-none">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#202124]">{c.label ?? "Charger"}</p>
          <p className="text-xs text-[#5F6368]">
            {c.connectorType} · <span className="font-mono">{c.powerKw} kW</span> ·{" "}
            <span className="font-mono">{inr(pricePerKwh)}/kWh</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>
          {st.label}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {soc !== null ? (
          <>
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8EAED]"
              role="progressbar"
              aria-valuenow={Math.round(soc)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[#F9AB00]"
                style={{ width: `${Math.round(soc)}%`, transition: "width 1s linear" }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-[#202124]">
              {Math.round(soc)}%
            </span>
            <span className="font-mono text-xs tabular-nums text-[#5F6368]">
              {rem !== null ? mmss(rem) : "–"}
            </span>
          </>
        ) : (
          <span className="font-mono text-sm text-[#5F6368]">–</span>
        )}
      </div>
    </li>
  );
}
