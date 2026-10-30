"use client";
import { useMemo, useState } from "react";
import { Plus, ArrowsClockwise, PlugsConnected } from "@phosphor-icons/react";
import { Num, SplitTitle, useNow, useReveal } from "@/components/torque/motion";
import { Button, EmptyState, Pill, Skeleton } from "@/components/torque/primitives";
import { toast } from "@/components/torque/toast";
import { useApi } from "@/lib/api";
import { useStationLive } from "@/components/torque/station/useStationLive";
import { liveAmount, liveKwh, progressOf } from "@/components/torque/station/liveMath";
import { BayCard } from "@/components/torque/station/BayCard";
import { Lanes } from "@/components/torque/station/Lanes";
import { Feed, PowerCard, RevenueBars, UtilizationCard } from "@/components/torque/station/Widgets";
import { WalkInDrawer } from "@/components/torque/station/WalkInDrawer";
import { ChargerDrawer } from "@/components/torque/station/ChargerDrawer";

type To = "CHARGING" | "COMPLETED" | "CANCELLED";

export default function StationPage() {
  const api = useApi();
  const { snap, loading, error, offset, live, reload } = useStationLive();
  const now = useNow(1000, offset);
  const [busy, setBusy] = useState<string | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const root = useReveal<HTMLDivElement>([!!snap]);

  const d = useMemo(() => {
    if (!snap) return null;
    const sessions = snap.sessions.filter((s) => s.status !== "CANCELLED");
    const charging = sessions.filter((s) => s.status === "CHARGING");
    const byCharger = new Map(charging.filter((s) => s.chargerId).map((s) => [s.chargerId as string, s]));
    const usable = snap.chargers.filter((c) => c.status === "AVAILABLE" || c.status === "CHARGING");
    return { sessions, charging, byCharger, usable, waiting: sessions.filter((s) => s.status === "QUEUED").length };
  }, [snap]);

  async function step(id: string, to: To) {
    setBusy(id);
    try {
      const r = await api<{ undoToken: string | null }>(`/api/operator/sessions/${id}/advance`, { method: "POST", body: JSON.stringify({ to }) });
      toast({
        title: to === "CHARGING" ? "Charging started" : to === "COMPLETED" ? "Session completed & billed" : "Removed from queue", tone: "ok",
        undo: r.undoToken ? async () => {
          try { await api(`/api/operator/sessions/${id}/undo`, { method: "POST" }); void reload(); }
          catch (e) { toast({ title: "Can't undo", desc: (e as Error).message, tone: "bad" }); }
        } : undefined,
      });
      void reload();
    } catch (e) { toast({ title: "Action failed", desc: (e as Error).message, tone: "bad" }); } finally { setBusy(null); }
  }
  async function startNext() {
    if (!snap) return;
    const first = snap.sessions.filter((s) => s.status === "QUEUED").sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt))[0];
    if (first) await step(first.id, "CHARGING");
  }

  if (loading) return <div style={{ display: "grid", gap: 14 }}><Skeleton h={64} w={300} /><Skeleton h={110} /><Skeleton h={300} /></div>;
  if (error || !snap || !d) return <div className="card"><EmptyState icon={<PlugsConnected size={32} />} title="Couldn't load your station" body={error ?? "No station found for your account."} action={<Button onClick={() => void reload()}>Retry</Button>} /></div>;

  const revenue = d.sessions.filter((s) => s.status === "COMPLETED" || s.status === "CHARGING").reduce((a, s) => a + liveAmount(s, now), 0);
  const energy = d.sessions.filter((s) => s.status === "COMPLETED" || s.status === "CHARGING").reduce((a, s) => a + liveKwh(s, now), 0);
  const busyBays = d.usable.filter((c) => c.status === "CHARGING").length;
  const kwNow = d.charging.reduce((a, s) => a + (progressOf(s, now) < 1 ? s.powerKw : 0), 0);
  const capacity = snap.chargers.reduce((a, c) => a + c.powerKw, 0);
  const openCharger = snap.chargers.find((c) => c.id === openId) ?? null;

  return (
    <div ref={root}>
      <div className="page-head">
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }} data-reveal>
            <span className="eyebrow">{snap.station.name}</span>
            <Pill c={live ? "ok" : "amber"} dot>{live ? "Live" : "Reconnecting"}</Pill>
            {snap.station.isDemo && <Pill c="violet">Demo data</Pill>}
          </div>
          <SplitTitle text="Station" />
        </div>
        <div className="page-actions" data-reveal>
          <Button magnetic onClick={() => void reload()}><ArrowsClockwise size={16} />Refresh</Button>
          <Button variant="primary" magnetic onClick={() => setWalkIn(true)}><Plus size={16} weight="bold" />Add walk-in</Button>
        </div>
      </div>

      <div className="stats">
        <div className="card" data-reveal><div className="stat-k">Revenue today</div><div className="stat-v"><Num value={revenue} decimals={2} prefix="₹" duration={1000} /></div><div className="stat-f"><Num value={snap.stats.sessionsToday} /> sessions</div></div>
        <div className="card" data-reveal><div className="stat-k">Energy delivered</div><div className="stat-v"><Num value={energy} decimals={1} suffix=" kWh" duration={1000} /></div><div className="stat-f">across all bays</div></div>
        <div className="card" data-reveal><div className="stat-k">Utilization</div><div className="stat-v"><Num value={d.usable.length ? Math.round((busyBays / d.usable.length) * 100) : 0} suffix="%" /></div><div className="stat-f">{busyBays} of {d.usable.length} bays in use</div></div>
        <div className="card" data-reveal><div className="stat-k">Avg wait</div><div className="stat-v"><Num value={snap.stats.avgWaitMin} decimals={1} suffix=" min" /></div><div className="stat-f"><Num value={d.waiting} /> waiting now</div></div>
      </div>

      <div className="card-h" style={{ margin: "22px 4px 12px" }} data-reveal><h2 style={{ fontSize: 22 }}>Charger bays</h2><span className="eyebrow">{snap.chargers.length} bays</span></div>
      {snap.chargers.length === 0 ? <div className="card"><EmptyState title="No chargers yet" body="Add chargers from the Chargers page." /></div> : (
        <div className="bays">
          {snap.chargers.map((c) => (
            <BayCard key={c.id} charger={c} session={d.byCharger.get(c.id)} now={now} waiting={d.waiting} busy={busy === d.byCharger.get(c.id)?.id}
              onComplete={(id) => step(id, "COMPLETED")} onStartNext={startNext} onOpen={() => setOpenId(c.id)} />
          ))}
        </div>)}

      <div className="card-h" style={{ margin: "26px 4px 12px" }} data-reveal><h2 style={{ fontSize: 22 }}>Queue</h2><span className="eyebrow">Waiting → Charging → Done</span></div>
      <Lanes sessions={d.sessions} chargers={snap.chargers} now={now} busyId={busy} onStep={step} />

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", margin: "14px 0" }}>
        <UtilizationCard busy={busyBays} total={d.usable.length} />
        <PowerCard kw={kwNow} capacityKw={capacity} />
        <RevenueBars hourly={snap.stats.hourlyRevenue} />
      </div>
      <Feed items={snap.activity} now={now} />

      <WalkInDrawer open={walkIn} onClose={() => setWalkIn(false)} onDone={() => void reload()} />
      <ChargerDrawer charger={openCharger} onClose={() => setOpenId(null)} onDone={() => void reload()} />
    </div>
  );
}