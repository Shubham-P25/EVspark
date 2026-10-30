"use client";
import { useEffect, useRef } from "react";
import { EASE, Gauge, Num, prefersReduced, Ring } from "../motion";
import { ago } from "./liveMath";
import type { ActivityDTO } from "./types";

export function UtilizationCard({ busy, total }: { busy: number; total: number }) {
  const v = total ? busy / total : 0;
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Utilization</span><span className="eyebrow">{busy}/{total} bays</span></div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <Ring value={v} size={140} stroke={14} color="var(--teal)">
          <div><div style={{ fontSize: 30, fontWeight: 600 }}><Num value={Math.round(v * 100)} suffix="%" /></div><div className="eyebrow">in use</div></div>
        </Ring>
      </div>
    </div>
  );
}

export function PowerCard({ kw, capacityKw }: { kw: number; capacityKw: number }) {
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Power draw</span><span className="eyebrow">{Math.round(capacityKw)} kW cap</span></div>
      <div style={{ display: "grid", placeItems: "center" }}>
        <Gauge value={capacityKw ? kw / capacityKw : 0} width={200}>
          <div><div style={{ fontSize: 28, fontWeight: 600 }}><Num value={kw} decimals={1} /></div><div className="eyebrow">kW now</div></div>
        </Gauge>
      </div>
    </div>
  );
}

export function RevenueBars({ hourly }: { hourly: number[] }) {
  const box = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...hourly);
  useEffect(() => {
    if (!box.current || prefersReduced()) return;
    box.current.querySelectorAll<HTMLElement>("i").forEach((el, i) =>
      el.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 700, delay: 40 * i, easing: EASE, fill: "backwards" }));
  }, [hourly.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Revenue · last 12 h</span><span className="eyebrow">₹ / hour</span></div>
      <div className="spark" ref={box}>{hourly.map((v, i) => <i key={i} title={`₹${Math.round(v)}`} style={{ height: `${Math.max(5, (v / max) * 100)}%` }} />)}</div>
    </div>
  );
}

const TONE: Record<ActivityDTO["tone"], string> = { ok: "var(--ok)", info: "var(--sky)", warn: "var(--amber)", bad: "var(--bad)" };
export function Feed({ items, now }: { items: ActivityDTO[]; now: number }) {
  return (
    <div className="card" data-reveal>
      <div className="card-h"><span className="card-t">Station activity</span><span className="eyebrow">live</span></div>
      <ul className="feed">
        {items.length === 0 && <li style={{ gridTemplateColumns: "1fr" }}><span className="muted">Activity will appear here.</span></li>}
        {items.map((a) => (<li key={a.id}><i className="dot" style={{ background: TONE[a.tone] }} /><span>{a.message}</span><span className="muted num" style={{ fontSize: 12 }}>{ago(a.createdAt, now)}</span></li>))}
      </ul>
    </div>
  );
}