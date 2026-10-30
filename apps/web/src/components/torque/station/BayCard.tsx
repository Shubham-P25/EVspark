"use client";
import { useEffect, useRef } from "react";
import { CaretRight, Wrench } from "@phosphor-icons/react";
import { Bar, EASE, Num, prefersReduced } from "../motion";
import { Button, Pill } from "../primitives";
import { etaMs, fmtDuration, liveAmount, liveKwh, progressOf, socNow } from "./liveMath";
import type { ChargerDTO, SessionDTO } from "./types";

const COLORS = ["#0ea5e9", "#8b5cf6", "#f43f5e", "#14b8a6", "#f59e0b", "#84cc16"];
const hash = (s: string) => Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0);

export function BayCard({ charger, session, now, waiting, busy, onComplete, onStartNext, onOpen }: {
  charger: ChargerDTO; session?: SessionDTO; now: number; waiting: number; busy: boolean;
  onComplete: (id: string) => void; onStartNext: () => void; onOpen: () => void;
}) {
  const car = useRef<SVGGElement>(null);
  const had = useRef(false);
  const charging = charger.status === "CHARGING" && !!session;
  const p = session ? progressOf(session, now) : 0;
  const ready = charging && p >= 1;
  const color = session ? COLORS[hash(session.plate) % COLORS.length] : "#94a3b8";

  useEffect(() => { // car drives in / out
    const el = car.current;
    if (!el) return;
    if (!prefersReduced()) {
      if (charging && !had.current) el.animate([{ transform: "translateX(150px)", opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 900, easing: EASE });
      if (!charging && had.current) el.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: "translateX(150px)", opacity: 0 }], { duration: 600, easing: EASE });
    }
    had.current = charging;
  }, [charging]);

  const statusPill = charger.status === "CHARGING" ? (ready ? <Pill c="ok" dot>Fully charged</Pill> : <Pill c="teal" dot>Charging</Pill>)
    : charger.status === "AVAILABLE" ? <Pill c="lime" dot>Free</Pill>
    : charger.status === "MAINTENANCE" ? <Pill c="amber" dot>Maintenance</Pill> : <Pill c="slate" dot>Offline</Pill>;

  return (
    <div className="card bay" data-state={charger.status} data-reveal>
      <div className="bay-top">
        <div><strong style={{ fontSize: 17, letterSpacing: "-.03em" }}>{charger.label}</strong>
          <div className="muted num" style={{ fontSize: 12, marginTop: 2 }}>{charger.connector.replace("_", "-")} · {charger.powerKw} kW · ₹{charger.pricePerKwh}/kWh</div></div>
        {statusPill}
      </div>

      <div className="bay-art">
        <svg className="bay-svg" viewBox="0 0 240 130" role="img" aria-label={`${charger.label} ${charger.status}`}>
          <rect x="0" y="109" width="240" height="2" fill="var(--line-strong)" />
          <rect x="88" y="66" width="140" height="43" rx="10" fill="none" stroke="var(--line-strong)" strokeDasharray="5 6" />
          <rect x="16" y="30" width="36" height="79" rx="11" fill="var(--ink)" />
          <rect x="22" y="38" width="24" height="17" rx="5" fill={charging ? "var(--teal)" : "var(--ink-3)"} />
          <path d="M35 64 l-7 11 h6 l-3 10 10-13 h-6 l3-8z" fill="var(--pill)" className={charging && !ready ? "pulse" : ""} />
          <path d="M52 86 C 70 86 78 92 98 90" stroke="var(--ink)" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity={charging ? 1 : 0.35} />
          {charging && !ready && <path d="M52 86 C 70 86 78 92 98 90" stroke="var(--pill)" strokeWidth="2" fill="none" strokeLinecap="round" className="cable-flow" />}
          <g ref={car} style={{ opacity: charging ? 1 : 0 }}>
            <rect x="96" y="80" width="130" height="24" rx="9" fill={color} />
            <path d="M120 80 L134 62 Q137 58 142 58 H184 Q189 58 192 62 L206 80 Z" fill={color} />
            <path d="M130 78 L140 64 H160 V78 Z" fill="#fff" opacity=".78" />
            <path d="M166 64 H184 L196 78 H166 Z" fill="#fff" opacity=".78" />
            <circle cx="122" cy="104" r="9" fill="var(--ink)" /><circle cx="122" cy="104" r="4" fill="#cbd5e1" />
            <circle cx="200" cy="104" r="9" fill="var(--ink)" /><circle cx="200" cy="104" r="4" fill="#cbd5e1" />
          </g>
        </svg>
      </div>

      {charging && session && (<>
        <div className="bay-row"><strong style={{ fontSize: 14.5 }}>{session.vehicleLabel}</strong><span className="muted num">{session.plate}</span></div>
        <Bar value={p} color={ready ? "var(--ok)" : "var(--teal)"} />
        <div className="bay-row">
          <span className="num"><Num value={Math.round(socNow(session, now))} suffix="%" duration={1000} /> battery</span>
          <span className="num muted">{ready ? "Ready" : `ETA ${fmtDuration(etaMs(session, now))}`}</span>
        </div>
        <div className="bay-row">
          <span className="num"><Num value={liveKwh(session, now)} decimals={2} suffix=" kWh" duration={1000} /></span>
          <strong className="num" style={{ fontSize: 17 }}><Num value={liveAmount(session, now)} decimals={2} prefix="₹" duration={1000} /></strong>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant={ready ? "primary" : "default"} size="sm" loading={busy} onClick={() => onComplete(session.id)} style={{ flex: 1 }}>{ready ? "Complete & bill" : "Complete early"}</Button>
          <Button size="sm" aria-label="Details" onClick={onOpen}><CaretRight size={16} /></Button>
        </div>
      </>)}

      {charger.status === "AVAILABLE" && (<>
        <div className="empty" style={{ padding: "6px 0" }}>{waiting > 0 ? `${waiting} vehicle${waiting > 1 ? "s" : ""} waiting` : "Free — waiting for a vehicle"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" variant="primary" disabled={waiting === 0} onClick={onStartNext} style={{ flex: 1 }}>Start next in queue</Button>
          <Button size="sm" aria-label="Details" onClick={onOpen}><CaretRight size={16} /></Button>
        </div>
      </>)}

      {(charger.status === "MAINTENANCE" || charger.status === "OFFLINE") && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span className="sub" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Wrench size={16} />Out of service</span>
          <Button size="sm" onClick={onOpen}>Manage</Button>
        </div>)}
    </div>
  );
}