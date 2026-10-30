"use client";
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Minus, Plus, X } from "@phosphor-icons/react";
import { EASE, prefersReduced, useMagnetic, useSlidingPill } from "./motion";

export function Spinner() { return <span className="spinner" aria-hidden="true" />; }

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "dark" | "ghost"; size?: "md" | "sm"; loading?: boolean; magnetic?: boolean;
};
export function Button({ variant = "default", size = "md", loading, magnetic, className = "", children, disabled, ...rest }: BtnProps) {
  const mref = useMagnetic<HTMLButtonElement>(0.22);
  const cls = ["btn", variant !== "default" && `btn-${variant}`, size === "sm" && "btn-sm", loading && "is-loading", className].filter(Boolean).join(" ");
  return (
    <button ref={magnetic ? mref : undefined} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      <span className="lbl" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{children}</span>
      <span className="spin"><Spinner /></span>
    </button>
  );
}

export function Pill({ c = "slate", dot, children }: { c?: string; dot?: boolean; children: ReactNode }) {
  return <span className="pill" data-c={c}>{dot && <i className="dot" />}{children}</span>;
}

export function Field({ label, hint, error, htmlFor, right, children }:
  { label: string; hint?: string; error?: string; htmlFor?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <label className="label" htmlFor={htmlFor}><span>{label}</span>{right}</label>
      {children}
      {error ? <span className="err" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className = "", ...rest }, ref) {
    return <input ref={ref} className={`input ${className}`} aria-invalid={invalid || undefined} {...rest} />;
  }
);

export function Segmented<T extends string>({ value, onChange, options }:
  { value: T; onChange: (v: T) => void; options: { value: T; label: string; icon?: ReactNode }[] }) {
  const box = useRef<HTMLDivElement>(null), pill = useRef<HTMLSpanElement>(null);
  useSlidingPill(box, pill, '[aria-pressed="true"]', value);
  return (
    <div className="seg" ref={box} role="group">
      <span className="seg-pill" ref={pill} />
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.icon}{o.label}</button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, multi }:
  { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className="chip" aria-pressed={on}
            onClick={() => onChange(multi ? (on ? value.filter((x) => x !== o) : [...value, o]) : [o])}>{o}</button>
        );
      })}
    </div>
  );
}

export function NumberStepper({ value, onChange, min = 0, max = 999, step = 1, suffix = "", decimals = 0 }:
  { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string; decimals?: number }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Number(n.toFixed(decimals)))));
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" onClick={() => set(value - step)}><Minus size={16} weight="bold" /></button>
      <span className="v num">{value}{suffix}</span>
      <button type="button" aria-label="Increase" onClick={() => set(value + step)}><Plus size={16} weight="bold" /></button>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}
      style={{ background: "none", border: 0, padding: 0, color: "inherit" }}>
      <i /><span>{label}</span>
    </button>
  );
}

export function Skeleton({ h = 20, w = "100%", r = 14 }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      {icon}<strong style={{ color: "var(--ink)" }}>{title}</strong>{body && <span>{body}</span>}{action}
    </div>
  );
}

/** Right drawer on desktop, bottom sheet on mobile. Animated in/out with WAAPI. */
export function Drawer({ open, onClose, title, children, footer }:
  { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const panel = useRef<HTMLDivElement>(null), veil = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  useEffect(() => {
    if (!mounted) return;
    const p = panel.current, v = veil.current;
    if (!p || !v) return;
    const sheet = window.matchMedia("(max-width: 900px)").matches;
    const off = sheet ? "translateY(105%)" : "translateX(110%)";
    if (open) {
      if (!prefersReduced()) { p.animate([{ transform: off }, { transform: "none" }], { duration: 520, easing: EASE }); v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); }
    } else if (prefersReduced()) {
      setMounted(false);
    } else {
      p.animate([{ transform: "none" }, { transform: off }], { duration: 360, easing: EASE, fill: "forwards" }).onfinish = () => setMounted(false);
      v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
    }
  }, [open, mounted]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!mounted) return null;
  return (
    <>
      <div ref={veil} className="veil" onClick={onClose} />
      <aside ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-h"><h3 style={{ fontSize: 20 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="drawer-b">{children}</div>
        {footer && <div className="drawer-f">{footer}</div>}
      </aside>
    </>
  );
}