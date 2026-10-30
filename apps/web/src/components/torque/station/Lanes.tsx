"use client";
import { ArrowRight, Check, X } from "@phosphor-icons/react";
import { Num } from "../motion";
import { Button, EmptyState, Pill } from "../primitives";
import { fmtDuration, inr, progressOf } from "./liveMath";
import type { ChargerDTO, SessionDTO } from "./types";

type To = "CHARGING" | "COMPLETED" | "CANCELLED";

function KCard({ s, now, children }: { s: SessionDTO; now: number; children?: React.ReactNode }) {
  return (
    <div className="kcard" data-reveal>
      <div className="kcard-r"><strong style={{ fontSize: 14 }}>{s.vehicleLabel}</strong><span className="muted num" style={{ fontSize: 12 }}>{s.plate}</span></div>
      <div className="kcard-r" style={{ fontSize: 12.5 }}>
        <span className="sub num">{s.socStart}% → {s.socTarget}% · {s.batteryKwh} kWh</span>
        {s.source === "DEMO" && <Pill c="violet">Demo</Pill>}
      </div>
      {children}
    </div>
  );
}

export function Lanes({ sessions, chargers, now, busyId, onStep }: {
  sessions: SessionDTO[]; chargers: ChargerDTO[]; now: number; busyId: string | null; onStep: (id: string, to: To) => void;
}) {
  const waiting = sessions.filter((s) => s.status === "QUEUED").sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt));
  const charging = sessions.filter((s) => s.status === "CHARGING");
  const done = sessions.filter((s) => s.status === "COMPLETED").sort((a, b) => Date.parse(b.endedAt ?? "0") - Date.parse(a.endedAt ?? "0")).slice(0, 8);
  const hasFree = chargers.some((c) => c.status === "AVAILABLE");
  return (
    <div className="lanes">
      <div className="lane">
        <div className="lane-h"><span>Waiting</span><Pill c="amber"><Num value={waiting.length} /></Pill></div>
        {waiting.length === 0 && <EmptyState title="Queue is empty" body="Vehicles that arrive show up here." />}
        {waiting.map((s) => (
          <KCard key={s.id} s={s} now={now}>
            <div className="kcard-r"><span className="num sub" style={{ fontSize: 12.5 }}>Waited {fmtDuration(now - Date.parse(s.queuedAt))}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" variant="ghost" aria-label="Remove from queue" onClick={() => onStep(s.id, "CANCELLED")}><X size={14} /></Button>
                <Button size="sm" variant="primary" loading={busyId === s.id} disabled={!hasFree} title={hasFree ? "Start charging" : "No free bay"} onClick={() => onStep(s.id, "CHARGING")}>Start<ArrowRight size={14} /></Button>
              </div></div>
          </KCard>))}
      </div>
      <div className="lane">
        <div className="lane-h"><span>Charging</span><Pill c="teal"><Num value={charging.length} /></Pill></div>
        {charging.length === 0 && <EmptyState title="No active sessions" />}
        {charging.map((s) => (
          <KCard key={s.id} s={s} now={now}>
            <div className="kcard-r"><span className="num sub" style={{ fontSize: 12.5 }}>{Math.round(progressOf(s, now) * 100)}% · {chargers.find((c) => c.id === s.chargerId)?.label ?? "—"}</span>
              <Button size="sm" loading={busyId === s.id} onClick={() => onStep(s.id, "COMPLETED")}>Complete<Check size={14} /></Button></div>
          </KCard>))}
      </div>
      <div className="lane">
        <div className="lane-h"><span>Completed today</span><Pill c="ok"><Num value={sessions.filter((s) => s.status === "COMPLETED").length} /></Pill></div>
        {done.length === 0 && <EmptyState title="Nothing billed yet" />}
        {done.map((s) => (
          <KCard key={s.id} s={s} now={now}>
            <div className="kcard-r"><span className="num sub" style={{ fontSize: 12.5 }}>{s.energyKwh.toFixed(2)} kWh</span><strong className="num">{inr(s.amount, 2)}</strong></div>
          </KCard>))}
      </div>
    </div>
  );
}