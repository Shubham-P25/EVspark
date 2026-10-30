"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightning } from "@phosphor-icons/react";
import { Num, Ring, SplitTitle, useReveal } from "./motion";
import { Segmented } from "./primitives";

export function AuthShell({ mode, children }: { mode: "login" | "signup"; children: React.ReactNode }) {
  const router = useRouter();
  const root = useReveal<HTMLDivElement>([]);
  const [p, setP] = useState(0.12);
  useEffect(() => { // ambient "charging" loop for the ring
    const id = setInterval(() => setP((v) => (v >= 1 ? 0.1 : Math.min(1, v + 0.22))), 1700);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { document.documentElement.setAttribute("data-theme", "light"); }, []);

  return (
    <div className="auth" ref={root}>
      <section className="auth-art">
        <div className="brand" data-reveal><span className="brand-mark"><Lightning size={20} weight="fill" /></span>EVspark</div>
        <div style={{ display: "grid", gap: 26 }}>
          <div><SplitTitle text="Charge smarter." /><p style={{ color: "var(--side-dim)", marginTop: 14, maxWidth: 380 }} data-reveal>
            Live wait times, queue-aware routing and a real operator panel — one network, no guessing.</p></div>
          <div data-reveal style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Ring value={p} size={132} stroke={13} color="var(--pill)" duration={1500}>
              <div><div className="num" style={{ fontSize: 28, fontWeight: 600 }}><Num value={Math.round(p * 100)} suffix="%" duration={1500} /></div>
                <div className="eyebrow" style={{ color: "var(--side-dim)" }}>charging</div></div>
            </Ring>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1 }}>
              {[{ k: "Stations", v: 128 }, { k: "Avg wait", v: 6, s: " min" }, { k: "Live now", v: 342 }, { k: "Uptime", v: 99, s: "%" }].map((t) => (
                <div key={t.k} style={{ background: "rgba(255,255,255,.06)", borderRadius: 16, padding: "12px 14px" }}>
                  <div className="eyebrow" style={{ color: "var(--side-dim)" }}>{t.k}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, marginTop: 6 }}><Num value={t.v} suffix={t.s} /></div>
                </div>))}
            </div>
          </div>
        </div>
        <div className="eyebrow" style={{ color: "var(--side-dim)" }}>Mumbai · live network</div>
      </section>
      <section className="auth-pane">
        <div className="auth-box">
          <div className="auth-tabs" data-reveal>
            <Segmented value={mode} onChange={(m) => router.push(m === "login" ? "/login" : "/signup")}
              options={[{ value: "login", label: "Sign in" }, { value: "signup", label: "Create account" }]} />
          </div>
          <div data-reveal>{children}</div>
        </div>
      </section>
    </div>
  );
}

