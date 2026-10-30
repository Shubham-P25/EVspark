"use client";
import { useEffect, useState } from "react";
import { Button, Drawer, Field, Input, Pill, Switch } from "../primitives";
import { toast } from "../toast";
import { useApi } from "@/lib/api";
import type { ChargerDTO } from "./types";

export function ChargerDrawer({ charger, onClose, onDone }: { charger: ChargerDTO | null; onClose: () => void; onDone: () => void }) {
  const api = useApi();
  const [price, setPrice] = useState(0); const [maint, setMaint] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => { if (charger) { setPrice(charger.pricePerKwh); setMaint(charger.status === "MAINTENANCE"); } }, [charger]);
  async function save() {
    if (!charger) return;
    if (!(price >= 1 && price <= 100)) return toast({ title: "Price must be ₹1–₹100", tone: "bad" });
    setSaving(true);
    try {
      await api(`/api/operator/chargers/${charger.id}`, { method: "PATCH", body: JSON.stringify({ pricePerKwh: price, maintenance: maint }) });
      toast({ title: `${charger.label} updated`, tone: "ok" }); onDone(); onClose();
    } catch (e) { toast({ title: "Couldn't update", desc: (e as Error).message, tone: "bad" }); } finally { setSaving(false); }
  }
  return (
    <Drawer open={!!charger} onClose={onClose} title={charger?.label ?? "Charger"}
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" loading={saving} onClick={save}>Save changes</Button></>}>
      {charger && (<>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Pill c="sky">{charger.connector.replace("_", "-")}</Pill><Pill c="orange">{charger.powerKw} kW</Pill><Pill c="slate">{charger.status}</Pill></div>
        <Field label="Price per kWh (₹)" hint="Applies to new sessions only"><Input type="number" step="any" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></Field>
        <Switch checked={maint} onChange={setMaint} label="Maintenance mode (out of service)" />
        {charger.status === "CHARGING" && <span className="hint">A vehicle is charging — complete the session before enabling maintenance.</span>}
      </>)}
    </Drawer>
  );
}