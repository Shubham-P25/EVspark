"use client";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

export const EASE = "cubic-bezier(.2,.8,.2,1)";
export const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Smoothly counts toward `target`; re-targets from the current value (good for live tickers). */
export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    if (prefersReduced()) { cur.current = target; setV(target); return; }
    const from = cur.current, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      cur.current = from + (target - from) * (1 - Math.pow(1 - p, 3));
      setV(cur.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function Num({ value, decimals = 0, prefix = "", suffix = "", duration = 900, className = "" }:
  { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; className?: string }) {
  const v = useCountUp(value, duration);
  return (
    <span className={`num ${className}`}>
      {prefix}{v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  );
}

/** Page title: every letter slides up (Torque "split-letter title"). */
export function SplitTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    const anims = Array.from(el.querySelectorAll<HTMLElement>(".ch")).map((c, i) =>
      c.animate(
        [{ transform: "translateY(110%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
        { duration: 700, delay: 26 * i, easing: EASE, fill: "backwards" }
      )
    );
    return () => anims.forEach((a) => a.cancel());
  }, [text]);
  return (
    <h1 ref={ref} className="page-title" aria-label={text}>
      {Array.from(text).map((c, i) => (
        <span key={i} className="ch" aria-hidden="true">{c === " " ? "\u00A0" : c}</span>
      ))}
    </h1>
  );
}

/** Staggered entrance for every descendant that has data-reveal. Re-runs only when deps change. */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReduced()) return;
    const anims = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).map((el, i) =>
      el.animate(
        [{ opacity: 0, transform: "translateY(14px) scale(.985)" }, { opacity: 1, transform: "none" }],
        { duration: 650, delay: 60 * i, easing: EASE, fill: "backwards" }
      )
    );
    return () => anims.forEach((a) => a.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Magnetic hover (buttons drift toward the cursor). */
export function useMagnetic<T extends HTMLElement>(strength = 0.22) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px,${(e.clientY - r.top - r.height / 2) * strength}px)`;
    };
    const leave = () => {
      el.animate([{ transform: el.style.transform || "none" }, { transform: "translate(0,0)" }], { duration: 480, easing: EASE });
      el.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, [strength]);
  return ref;
}

/** Sliding highlight pill (sidebar nav + segmented controls). `activeSelector` marks the active child. */
export function useSlidingPill(
  container: RefObject<HTMLElement | null>,
  pill: RefObject<HTMLElement | null>,
  activeSelector: string,
  dep: unknown
) {
  const first = useRef(true);
  useLayoutEffect(() => {
    const c = container.current, p = pill.current;
    if (!c || !p) return;
    const place = (animate: boolean) => {
      const a = c.querySelector<HTMLElement>(activeSelector);
      if (!a) { p.style.opacity = "0"; return; }
      const to = {
        transform: `translate(${a.offsetLeft}px, ${a.offsetTop}px)`,
        width: `${a.offsetWidth}px`,
        height: `${a.offsetHeight}px`,
      };
      if (animate && !prefersReduced() && p.style.width) {
        p.animate(
          [{ transform: p.style.transform || "none", width: p.style.width, height: p.style.height }, to],
          { duration: 460, easing: EASE }
        );
      }
      Object.assign(p.style, to);
      p.style.opacity = "1";
    };
    place(!first.current);
    first.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [container, pill, activeSelector, dep]);
}

/** Circular ring. value 0..1. Stroke animates with WAAPI. children render in the centre. */
export function Ring({ value, size = 104, stroke = 11, color = "var(--teal)", duration = 900, easing = EASE, children }:
  { value: number; size?: number; stroke?: number; color?: string; duration?: number; easing?: string; children?: React.ReactNode }) {
  const arc = useRef<SVGCircleElement>(null);
  const prev = useRef(0);
  const v = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    const el = arc.current;
    if (!el) return;
    if (!prefersReduced()) el.animate([{ strokeDashoffset: 1 - prev.current }, { strokeDashoffset: 1 - v }], { duration, easing });
    el.style.strokeDashoffset = String(1 - v);
    prev.current = v;
  }, [v, duration, easing]);
  const r = (size - stroke) / 2;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={stroke} />
        <circle ref={arc} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1} strokeOpacity={v <= 0 ? 0 : 1} />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  );
}

/** Half-circle gauge (power meter). value 0..1. */
export function Gauge({ value, width = 190, color = "var(--orange)", children }:
  { value: number; width?: number; color?: string; children?: React.ReactNode }) {
  const arc = useRef<SVGPathElement>(null);
  const prev = useRef(0);
  const v = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    const el = arc.current;
    if (!el) return;
    if (!prefersReduced()) el.animate([{ strokeDashoffset: 1 - prev.current }, { strokeDashoffset: 1 - v }], { duration: 900, easing: EASE });
    el.style.strokeDashoffset = String(1 - v);
    prev.current = v;
  }, [v]);
  const d = "M 14 100 A 86 86 0 0 1 186 100";
  return (
    <div style={{ position: "relative", width, height: width * 0.56 }}>
      <svg viewBox="0 0 200 110" width={width} aria-hidden="true">
        <path d={d} fill="none" stroke="var(--line-strong)" strokeWidth="14" strokeLinecap="round" />
        <path ref={arc} d={d} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={1} strokeOpacity={v <= 0 ? 0 : 1} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "end center", paddingBottom: 2, textAlign: "center" }}>{children}</div>
    </div>
  );
}

/** Thin horizontal progress bar animated with transform (no layout cost). */
export function Bar({ value, color = "var(--teal)", duration = 1000 }: { value: number; color?: string; duration?: number }) {
  const el = useRef<HTMLElement>(null);
  const prev = useRef(0);
  const v = Math.max(0, Math.min(1, value || 0));
  useEffect(() => {
    const b = el.current;
    if (!b) return;
    if (!prefersReduced()) b.animate([{ transform: `scaleX(${prev.current})` }, { transform: `scaleX(${v})` }], { duration, easing: "linear" });
    b.style.transform = `scaleX(${v})`;
    prev.current = v;
  }, [v, duration]);
  return <div className="bar"><b ref={el} style={{ background: color }} /></div>;
}

/** Wall-clock that ticks every `ms`, corrected by the server clock offset. */
export function useNow(ms = 1000, offsetMs = 0) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offsetMs), ms);
    return () => clearInterval(id);
  }, [ms, offsetMs]);
  return now;
}