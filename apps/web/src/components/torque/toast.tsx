"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { EASE, prefersReduced } from "./motion";

export type ToastItem = {
  id: number; title: string; desc?: string; tone?: "ok" | "bad" | "info";
  undo?: () => void | Promise<void>; ttl: number;
};
let items: ToastItem[] = [];
let nid = 1;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function toast(t: Omit<ToastItem, "id" | "ttl"> & { ttl?: number }) {
  const id = nid++;
  items = [...items, { ...t, id, ttl: t.ttl ?? (t.undo ? 7000 : 4200) }];
  emit();
  return id;
}
export function dismissToast(id: number) { items = items.filter((i) => i.id !== id); emit(); }

function ToastView({ t }: { t: ToastItem }) {
  const root = useRef<HTMLDivElement>(null);
  const life = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current, bar = life.current;
    if (el && !prefersReduced()) el.animate([{ transform: "translateY(24px) scale(.96)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 480, easing: EASE });
    if (bar && !prefersReduced()) bar.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: t.ttl, easing: "linear", fill: "forwards" });
    const timer = setTimeout(() => close(), t.ttl);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function close() {
    const el = root.current;
    if (!el || prefersReduced()) return dismissToast(t.id);
    el.animate([{ opacity: 1 }, { opacity: 0, transform: "translateX(30px)" }], { duration: 260, easing: EASE, fill: "forwards" }).onfinish = () => dismissToast(t.id);
  }
  const color = t.tone === "bad" ? "var(--bad)" : t.tone === "ok" ? "var(--teal)" : "var(--pill)";
  return (
    <div ref={root} className="toast" role="status">
      <span className="dot" style={{ background: color, width: 10, height: 10 }} />
      <div className="grow"><div className="t">{t.title}</div>{t.desc && <div className="d">{t.desc}</div>}</div>
      {t.undo && <button className="undo" onClick={async () => { await t.undo?.(); close(); }}>Undo</button>}
      <div ref={life} className="life" style={{ background: color }} />
    </div>
  );
}

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => items);
  return <div className="toasts" aria-live="polite">{list.map((t) => <ToastView key={t.id} t={t} />)}</div>;
}