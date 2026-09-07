"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Toggle } from "@/components/ui/Toggle";
import { TopBar } from "@/components/layout/TopBar";
import { MOCK_STATIONS } from "@/lib/mockData";
import type { ChargerStatus } from "@/types";

export default function OperatorPage() {
  const router = useRouter();
  const station = MOCK_STATIONS[0];
  const [chargers, setChargers] = useState(station.chargers);
  const update = (id: string, status: ChargerStatus) => setChargers((current) => current.map((charger) => charger.id === id ? { ...charger, status } : charger));
  return <><TopBar eyebrow="Operator / My station" title={station.name} /><main className="space-y-8 p-5 sm:p-8"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Sessions today" value={78} delta={12} /><Stat label="Revenue today" value={7020} prefix="₹" delta={8} /><Stat label="Avg wait (AI)" value={8} suffix=" min" delta={-4} /><Stat label="Active chargers" value={5} suffix={` / ${chargers.length}`} /></div><section><div className="flex items-center justify-between"><h2 className="font-mono text-xs uppercase tracking-widest text-muted">Charger status</h2><Badge variant="primary">Live sync</Badge></div><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{chargers.map((charger) => <Card key={charger.id} className={`border-l-4 p-5 ${charger.status === "free" ? "border-l-green" : charger.status === "busy" ? "border-l-red" : "border-l-yellow"}`}><div className="flex items-start justify-between"><div><h3 className="font-medium">{charger.label}</h3><p className="mt-1 font-mono text-xs text-muted">{charger.connectorType} · {charger.powerKw} kW</p></div><Toggle status={charger.status} onChange={(status) => update(charger.id, status)} /></div><div className="mt-10 flex items-center justify-between"><Badge variant={charger.status === "free" ? "green" : charger.status === "busy" ? "red" : "yellow"}>{charger.status}</Badge><span className="text-xs text-muted">updated now</span></div></Card>)}</div></section><Card className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-medium">Demand outlook</h2><p className="mt-1 text-sm text-muted">Friday evening demand is trending above average.</p></div><Button variant="secondary" onClick={() => router.push("/operator/analytics")}>View analytics →</Button></Card></main></>;
}