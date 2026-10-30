"use client";
import { useState } from "react";
import { Button, Drawer, Field, Input, NumberStepper } from "../primitives";
import { toast } from "../toast";
import { ApiError, useApi } from "@/lib/api";

export function WalkInDrawer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const api = useApi();
  const [f, setF] = useState({ vehicleLabel: "", plate: "", batteryKwh: 40, vehicleMaxKw: 50, socStart: 20, socTarget: 80 });
  const [err, setErr] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  async function submit() {
    const e: Record<string, string> = {};
    if (f.vehicleLabel.trim().length < 2) e.vehicleLabel = "Vehicle name is required";
    if (!/^[A-Za-z0-9 -]{4,14}$/.test(f.plate)) e.plate = "Enter the number plate";
    if (f.socTarget <= f.socStart) e.socTarget = "Target must be above the current charge";
    setErr(e); if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await api("/api/operator/sessions", { method: "POST", body: JSON.stringify(f) });
      toast({ title: "Vehicle added", desc: "Started automatically if a bay is free.", tone: "ok" });
      onDone(); onClose();
      setF({ vehicleLabel: "", plate: "", batteryKwh: 40, vehicleMaxKw: 50, socStart: 20, socTarget: 80 });
    } catch (x) { if (x instanceof ApiError && x.fields) setErr(x.fields); toast({ title: "Couldn't add vehicle", desc: (x as Error).message, tone: "bad" }); }
    finally { setSaving(false); }
  }
  return (
    <Drawer open={open} onClose={onClose} title="Add walk-in vehicle"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={saving} onClick={submit}>Add to queue</Button></>}>
      <Field label="Vehicle" htmlFor="vl" error={err.vehicleLabel}><Input id="vl" invalid={!!err.vehicleLabel} value={f.vehicleLabel} onChange={(e) => setF({ ...f, vehicleLabel: e.target.value })} placeholder="Tata Nexon EV" /></Field>
      <Field label="Number plate" htmlFor="pl" error={err.plate}><Input id="pl" invalid={!!err.plate} value={f.plate} onChange={(e) => setF({ ...f, plate: e.target.value.toUpperCase() })} placeholder="MH 02 AB 1234" /></Field>
      <Field label="Battery (kWh)"><NumberStepper value={f.batteryKwh} onChange={(v) => setF({ ...f, batteryKwh: v })} min={5} max={200} step={0.5} decimals={1} /></Field>
      <Field label="Vehicle max charge speed (kW)"><NumberStepper value={f.vehicleMaxKw} onChange={(v) => setF({ ...f, vehicleMaxKw: v })} min={3} max={350} step={5} /></Field>
      <Field label={`Current charge: ${f.socStart}%`}><input className="range" type="range" min={1} max={95} value={f.socStart} onChange={(e) => setF({ ...f, socStart: Number(e.target.value) })} /></Field>
      <Field label={`Charge to: ${f.socTarget}%`} error={err.socTarget}><input className="range" type="range" min={5} max={100} value={f.socTarget} onChange={(e) => setF({ ...f, socTarget: Number(e.target.value) })} /></Field>
    </Drawer>
  );
}