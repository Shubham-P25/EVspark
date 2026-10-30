"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Buildings, Car, Check, Crosshair, Lightning, Plus, Trash } from "@phosphor-icons/react";
import { EASE, Num, prefersReduced, Ring } from "../motion";
import { Button, Chips, Field, Input, NumberStepper, Segmented, Switch } from "../primitives";
import { toast } from "../toast";
import { ApiError, useApi, type Me } from "@/lib/api";
import * as S from "./schemas";
import { INFO } from "./info";
import type { ZodTypeAny } from "zod";

type Role = "DRIVER" | "OPERATOR";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;

const DEFAULTS: Record<Role, Data> = {
  DRIVER: { displayName: "", phone: "", city: "Mumbai",
    vehicle: { make: "", model: "", batteryKwh: 40, connector: "CCS2", maxDcKw: 50, plate: "" },
    prefs: { maxPricePerKwh: 25, habits: [], notifyWait: true, notifyOffers: false } },
  OPERATOR: { displayName: "", businessName: "", phone: "", gstin: "",
    station: { name: "", address: "", lat: 19.0669, lng: 72.8697, open24h: true, opensAt: "06:00", closesAt: "23:00", amenities: [] },
    chargers: [{ connector: "CCS2", powerKw: 60, pricePerKwh: 18, count: 2 }] },
};
const STEPS: Record<Role, { title: string; sub: string; schema: ZodTypeAny }[]> = {
  DRIVER: [
    { title: "About you", sub: "So we can personalise your map.", schema: S.driverStep1 },
    { title: "Your vehicle", sub: "We match chargers to your car.", schema: S.driverStep2 },
    { title: "How you charge", sub: "Price ceiling and alerts.", schema: S.driverStep3 },
  ],
  OPERATOR: [
    { title: "You & your business", sub: "Who runs this station?", schema: S.operatorStep1 },
    { title: "Your station", sub: "Where drivers will find you.", schema: S.operatorStep2 },
    { title: "Your chargers", sub: "Connector, power and price.", schema: S.operatorStep3 },
  ],
};
const PRESETS = [
  { label: "2× CCS2 60 kW", v: { connector: "CCS2", powerKw: 60, pricePerKwh: 18, count: 2 } },
  { label: "1× CCS2 30 kW", v: { connector: "CCS2", powerKw: 30, pricePerKwh: 16, count: 1 } },
  { label: "2× Type 2 22 kW", v: { connector: "TYPE2", powerKw: 22, pricePerKwh: 12, count: 2 } },
  { label: "4× Bharat AC-001", v: { connector: "BHARAT_AC001", powerKw: 3.3, pricePerKwh: 10, count: 4 } },
];

const get = (o: Data, p: string): any => p.split(".").reduce((a: any, k) => (a == null ? undefined : a[k]), o);
function setIn(obj: Data, path: string[], value: unknown): Data {
  const [k, ...rest] = path;
  const base: Data = Array.isArray(obj) ? ([...obj] as unknown as Data) : { ...obj };
  base[k] = rest.length ? setIn((base[k] ?? {}) as Data, rest, value) : value;
  return base;
}

function ProgSeg({ state }: { state: "done" | "current" | "todo" }) {
  const b = useRef<HTMLElement>(null); const prev = useRef(0);
  const to = state === "done" ? 1 : state === "current" ? 0.45 : 0;
  useEffect(() => {
    const el = b.current; if (!el) return;
    if (!prefersReduced()) el.animate([{ transform: `scaleX(${prev.current})` }, { transform: `scaleX(${to})` }], { duration: 700, easing: EASE });
    el.style.transform = `scaleX(${to})`; prev.current = to;
  }, [to]);
  return <div className="prog-seg" data-state={state === "done" ? "done" : "todo"}><b ref={b} /></div>;
}

export function Wizard({ me, onRoleChanged }: { me: Me; onRoleChanged: () => Promise<void> }) {
  const api = useApi(); const router = useRouter();
  const role: Role = me.role === "OPERATOR" ? "OPERATOR" : "DRIVER";
  const steps = STEPS[role];
  const [data, setData] = useState<Data>(() => ({ ...DEFAULTS[role], displayName: me.name ?? "", ...(me.onboardingDraft?.data ?? {}) }));
  const [step, setStep] = useState(() => Math.min(me.onboardingDraft?.step ?? 0, steps.length - 1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const dir = useRef(1);

  // slide-in on every step change
  useEffect(() => {
    if (!body.current || prefersReduced()) return;
    body.current.animate([{ opacity: 0, transform: `translateX(${28 * dir.current}px)` }, { opacity: 1, transform: "none" }], { duration: 520, easing: EASE });
  }, [step]);

  const set = (path: string, v: unknown) => { setData((d) => setIn(d, path.split("."), v)); setErrors((e) => { const n = { ...e }; delete n[path]; return n; }); };
  const err = (p: string) => errors[p];
  const ci = (p: string) => ({ id: p, invalid: !!errors[p], value: (get(data, p) as string | number | undefined) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(p, e.target.value) });
  const num = (p: string) => ({ id: p, invalid: !!errors[p], type: "number" as const, inputMode: "decimal" as const, value: (get(data, p) as string | number | undefined) ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(p, e.target.value === "" ? NaN : Number(e.target.value)) });

  function validate(): boolean {
    const r = steps[step].schema.safeParse(data);
    if (r.success) { setErrors({}); return true; }
    const m: Record<string, string> = {};
    for (const i of r.error.issues) { const k = i.path.join("."); if (!m[k]) m[k] = i.message; }
    setErrors(m);
    body.current?.animate([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 320, easing: EASE });
    return false;
  }

  async function next() {
    if (!validate()) return;
    setSaving(true);
    try {
      if (step < steps.length - 1) {
        await api("/api/onboarding/draft", { method: "PUT", body: JSON.stringify({ step: step + 1, data }) });
        dir.current = 1; setStep(step + 1);
      } else {
        await api("/api/onboarding/complete", { method: "POST", body: JSON.stringify({ data }) });
        setDone(true);
        setTimeout(() => router.replace(role === "OPERATOR" ? "/station" : "/map"), 1800);
      }
    } catch (e) {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
      toast({ title: "Couldn't save", desc: (e as Error).message, tone: "bad" });
    } finally { setSaving(false); }
  }
  function back() { dir.current = -1; setStep((s) => Math.max(0, s - 1)); setErrors({}); }

  async function switchRole(r: Role) {
    if (r === role) return;
    try { await api("/api/me/role", { method: "POST", body: JSON.stringify({ role: r }) }); await onRoleChanged(); }
    catch (e) { toast({ title: "Couldn't switch role", desc: (e as Error).message, tone: "bad" }); }
  }
  // role switch remounts Wizard from the page via key={me.role}

  const locateMe = () => navigator.geolocation?.getCurrentPosition(
    (p) => { set("station.lat", Number(p.coords.latitude.toFixed(6))); set("station.lng", Number(p.coords.longitude.toFixed(6))); toast({ title: "Location set", tone: "ok" }); },
    () => toast({ title: "Location blocked", desc: "Enter latitude and longitude manually.", tone: "bad" }));

  const totalChargers = useMemo(() => (data.chargers ?? []).reduce((s: number, c: Data) => s + (Number(c.count) || 0), 0), [data.chargers]);
  const totalKw = useMemo(() => (data.chargers ?? []).reduce((s: number, c: Data) => s + (Number(c.count) || 0) * (Number(c.powerKw) || 0), 0), [data.chargers]);

  return (
    <div className="ob">
      <aside className="ob-rail">
        <div className="brand" style={{ padding: 0 }}><span className="brand-mark"><Lightning size={20} weight="fill" /></span>EVspark</div>
        <div><div className="eyebrow" style={{ color: "var(--side-dim)" }}>{role === "DRIVER" ? "Driver" : "Station operator"}</div>
          <h2 style={{ fontSize: 30, marginTop: 8, color: "#fff" }}>{role === "DRIVER" ? "Never wait blind again." : "Run your station like a pro."}</h2></div>
        {INFO[role].map((b) => (
          <div key={b.title} className="info" data-on={done || b.step === step}>
            <div className="info-i">{b.icon}</div><div><h4>{b.title}</h4><p>{b.body}</p></div>
          </div>
        ))}
      </aside>

      <main className="ob-main">
        <div className="ob-card">
          {done ? (
            <div style={{ display: "grid", placeItems: "center", gap: 18, textAlign: "center", padding: 30 }}>
              <Ring value={1} size={150} stroke={14} color="var(--ok)" duration={1100}><Check size={54} weight="bold" color="var(--ok)" /></Ring>
              <h2 style={{ fontSize: 34 }}>You&apos;re all set</h2>
              <p className="sub">Taking you to your {role === "OPERATOR" ? "station" : "map"}…</p>
            </div>
          ) : (<>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span className="eyebrow">Step {step + 1} of {steps.length}</span>
              <Segmented value={role} onChange={switchRole} options={[
                { value: "DRIVER", label: "Driver", icon: <Car size={15} /> }, { value: "OPERATOR", label: "Operator", icon: <Buildings size={15} /> }]} />
            </div>
            <div className="prog" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step}>
              {steps.map((_, i) => <ProgSeg key={i} state={i < step ? "done" : i === step ? "current" : "todo"} />)}
            </div>
            <div><h2 style={{ fontSize: 36 }}>{steps[step].title}</h2><p className="sub" style={{ marginTop: 6 }}>{steps[step].sub}</p></div>

            <div className="ob-body" ref={body}>
              {role === "DRIVER" && step === 0 && (<>
                <Field label="What should we call you?" htmlFor="displayName" error={err("displayName")}><Input {...ci("displayName")} placeholder="Shubham" /></Field>
                <div className="ob-grid">
                  <Field label="Mobile (optional)" htmlFor="phone" error={err("phone")} hint="For wait-time alerts"><Input {...ci("phone")} placeholder="98xxxxxx10" inputMode="tel" /></Field>
                  <Field label="City" htmlFor="city" error={err("city")}>
                    <select className="input" id="city" value={data.city} onChange={(e) => set("city", e.target.value)}>{S.CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
                </div></>)}
              {role === "DRIVER" && step === 1 && (<>
                <div className="ob-grid">
                  <Field label="Make" htmlFor="vehicle.make" error={err("vehicle.make")}><Input {...ci("vehicle.make")} placeholder="Tata" /></Field>
                  <Field label="Model" htmlFor="vehicle.model" error={err("vehicle.model")}><Input {...ci("vehicle.model")} placeholder="Nexon EV" /></Field>
                </div>
                <div className="ob-grid">
                  <Field label="Battery (kWh)" error={err("vehicle.batteryKwh")}><NumberStepper value={data.vehicle.batteryKwh} onChange={(v) => set("vehicle.batteryKwh", v)} min={5} max={200} step={0.5} decimals={1} /></Field>
                  <Field label="Max DC speed (kW)" error={err("vehicle.maxDcKw")}><NumberStepper value={data.vehicle.maxDcKw} onChange={(v) => set("vehicle.maxDcKw", v)} min={3} max={350} step={5} /></Field>
                </div>
                <Field label="Connector" error={err("vehicle.connector")}>
                  <Chips options={[...S.CONNECTORS]} value={[data.vehicle.connector]} onChange={(v) => set("vehicle.connector", v[0])} /></Field>
                <Field label="Number plate" htmlFor="vehicle.plate" error={err("vehicle.plate")}><Input {...ci("vehicle.plate")} placeholder="MH 02 AB 1234" style={{ textTransform: "uppercase" }} /></Field></>)}
              {role === "DRIVER" && step === 2 && (<>
                <Field label={`Max price you'll pay: ₹${data.prefs.maxPricePerKwh}/kWh`}>
                  <input className="range" type="range" min={5} max={60} step={1} value={data.prefs.maxPricePerKwh} onChange={(e) => set("prefs.maxPricePerKwh", Number(e.target.value))} /></Field>
                <Field label="Where do you usually charge?"><Chips multi options={[...S.HABITS]} value={data.prefs.habits} onChange={(v) => set("prefs.habits", v)} /></Field>
                <Switch checked={data.prefs.notifyWait} onChange={(v) => set("prefs.notifyWait", v)} label="Alert me when a bay frees up at my favourites" />
                <Switch checked={data.prefs.notifyOffers} onChange={(v) => set("prefs.notifyOffers", v)} label="Tell me about price drops" /></>)}

              {role === "OPERATOR" && step === 0 && (<>
                <div className="ob-grid">
                  <Field label="Your name" htmlFor="displayName" error={err("displayName")}><Input {...ci("displayName")} /></Field>
                  <Field label="Business name" htmlFor="businessName" error={err("businessName")}><Input {...ci("businessName")} placeholder="Volt Hub Pvt Ltd" /></Field>
                </div>
                <div className="ob-grid">
                  <Field label="Mobile" htmlFor="phone" error={err("phone")}><Input {...ci("phone")} inputMode="tel" placeholder="98xxxxxx10" /></Field>
                  <Field label="GSTIN (optional)" htmlFor="gstin" error={err("gstin")}><Input {...ci("gstin")} placeholder="27ABCDE1234F1Z5" style={{ textTransform: "uppercase" }} /></Field>
                </div></>)}
              {role === "OPERATOR" && step === 1 && (<>
                <Field label="Station name" htmlFor="station.name" error={err("station.name")}><Input {...ci("station.name")} placeholder="Volt Hub — BKC" /></Field>
                <Field label="Full address" htmlFor="station.address" error={err("station.address")}><Input {...ci("station.address")} placeholder="Plot C-54, G Block, BKC, Mumbai 400051" /></Field>
                <div className="ob-grid">
                  <Field label="Latitude" htmlFor="station.lat" error={err("station.lat")}><Input {...num("station.lat")} step="any" /></Field>
                  <Field label="Longitude" htmlFor="station.lng" error={err("station.lng")}><Input {...num("station.lng")} step="any" /></Field>
                </div>
                <Button size="sm" onClick={locateMe}><Crosshair size={16} />Use my current location</Button>
                <Switch checked={data.station.open24h} onChange={(v) => set("station.open24h", v)} label="Open 24 hours" />
                {!data.station.open24h && (<div className="ob-grid">
                  <Field label="Opens" htmlFor="station.opensAt" error={err("station.opensAt")}><Input {...ci("station.opensAt")} type="time" /></Field>
                  <Field label="Closes" htmlFor="station.closesAt" error={err("station.closesAt")}><Input {...ci("station.closesAt")} type="time" /></Field></div>)}
                <Field label="Amenities"><Chips multi options={[...S.AMENITIES]} value={data.station.amenities} onChange={(v) => set("station.amenities", v)} /></Field></>)}
              {role === "OPERATOR" && step === 2 && (<>
                <div className="chips">{PRESETS.map((p) => <button key={p.label} type="button" className="chip" onClick={() => set("chargers", [...data.chargers, { ...p.v }])}>+ {p.label}</button>)}</div>
                {err("chargers") && <span className="err">{err("chargers")}</span>}
                {data.chargers.map((c: Data, i: number) => (
                  <div className="row-card" key={i}>
                    <Field label="Connector"><select className="input" value={c.connector} onChange={(e) => set(`chargers.${i}.connector`, e.target.value)}>
                      {S.CONNECTORS.map((k) => <option key={k} value={k}>{S.CONNECTOR_LABEL[k]}</option>)}</select></Field>
                    <Field label="Power (kW)" error={err(`chargers.${i}.powerKw`)}><Input {...num(`chargers.${i}.powerKw`)} step="any" /></Field>
                    <Field label="₹ / kWh" error={err(`chargers.${i}.pricePerKwh`)}><Input {...num(`chargers.${i}.pricePerKwh`)} step="any" /></Field>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <NumberStepper value={c.count} onChange={(v) => set(`chargers.${i}.count`, v)} min={1} max={12} suffix="×" />
                      <button className="icon-btn" aria-label="Remove" onClick={() => set("chargers", data.chargers.filter((_: Data, j: number) => j !== i))}><Trash size={16} /></button></div>
                  </div>))}
                <Button size="sm" onClick={() => set("chargers", [...data.chargers, { connector: "CCS2", powerKw: 30, pricePerKwh: 16, count: 1 }])}><Plus size={16} />Add charger type</Button>
                <div className="card" style={{ display: "flex", gap: 28, padding: 16 }}>
                  <div><div className="eyebrow">Chargers</div><div style={{ fontSize: 28, fontWeight: 600 }}><Num value={totalChargers} /></div></div>
                  <div><div className="eyebrow">Total capacity</div><div style={{ fontSize: 28, fontWeight: 600 }}><Num value={totalKw} decimals={0} suffix=" kW" /></div></div></div></>)}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <Button variant="ghost" onClick={back} disabled={step === 0 || saving}><ArrowLeft size={16} />Back</Button>
              <Button variant="primary" magnetic loading={saving} onClick={next}>{step === steps.length - 1 ? "Finish setup" : "Continue"}<ArrowRight size={16} /></Button>
            </div>
          </>)}
        </div>
      </main>
    </div>
  );
}
