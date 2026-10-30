"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { ChartLineUp, CurrencyInr, Gear, Lightning, ListChecks, MagnifyingGlass, Moon, PlugsConnected, Sun } from "@phosphor-icons/react";
import { EASE, prefersReduced, useSlidingPill } from "./motion";

export const NAV = [
  { href: "/station", label: "Station", Icon: Lightning },
  { href: "/chargers", label: "Chargers", Icon: PlugsConnected },
  { href: "/sessions", label: "Sessions", Icon: ListChecks },
  { href: "/analytics", label: "Analytics", Icon: ChartLineUp },
  { href: "/pricing", label: "Pricing", Icon: CurrencyInr },
  { href: "/settings", label: "Settings", Icon: Gear },
];

export function toggleTheme() {
  const el = document.documentElement;
  const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
  el.setAttribute("data-theme", next);
  try { localStorage.setItem("tq-theme", next); } catch {}
  window.dispatchEvent(new Event("tq-theme-change"));
}

function ThemeButton() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const update = () => setDark(document.documentElement.getAttribute("data-theme") === "dark");
    update();
    window.addEventListener("tq-theme-change", update);
    return () => window.removeEventListener("tq-theme-change", update);
  }, []);

  return (
    <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function AppShell({ children, stationName }: { children: React.ReactNode; stationName?: string }) {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null), pill = useRef<HTMLSpanElement>(null);
  const active = NAV.find((n) => path.startsWith(n.href))?.href ?? "";
  useSlidingPill(nav, pill, '[aria-current="page"]', active);
  const [cmd, setCmd] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmd((v) => !v); }
      if (e.key === "Escape") setCmd(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span className="brand-mark"><Lightning size={20} weight="fill" /></span>EVspark</div>
        <nav className="nav" ref={nav}>
          <span className="nav-pill" ref={pill} />
          {NAV.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="nav-item" aria-current={active === href ? "page" : undefined}>
              <Icon size={20} weight={active === href ? "fill" : "regular"} /><span className="t">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot"><strong style={{ color: "#fff", display: "block", fontSize: 13 }}>{stationName ?? "Your station"}</strong>Operator panel</div>
      </aside>
      <div className="main">
        <header className="top">
          <button className="search" onClick={() => setCmd(true)} aria-label="Search">
            <MagnifyingGlass size={18} /><span className="grow">Search or jump to…</span><span className="kbd">⌘K</span>
          </button>
          <div className="top-spacer" />
          <ThemeButton />
          <UserButton />
        </header>
        {children}
      </div>
      {cmd && <CommandPalette onClose={() => setCmd(false)} />}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState(""), [i, setI] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const items = useMemo(() => [
    ...NAV.map((n) => ({ label: `Go to ${n.label}`, run: () => router.push(n.href) })),
    { label: "Toggle light / dark theme", run: toggleTheme },
  ].filter((x) => x.label.toLowerCase().includes(q.toLowerCase())), [q, router]);
  useEffect(() => {
    if (box.current && !prefersReduced()) box.current.animate([{ opacity: 0, transform: "translate(-50%,-12px) scale(.98)" }, { opacity: 1, transform: "translate(-50%,0) scale(1)" }], { duration: 320, easing: EASE });
  }, []);
  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className="cmd" ref={box} role="dialog" aria-label="Command palette">
        <input autoFocus placeholder="Type a command…" value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setI((v) => Math.min(items.length - 1, v + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
            if (e.key === "Enter" && items[i]) { items[i].run(); onClose(); }
          }} />
        {items.map((it, idx) => (
          <div key={it.label} className="cmd-item" aria-selected={idx === i} onMouseEnter={() => setI(idx)} onClick={() => { it.run(); onClose(); }}>{it.label}</div>
        ))}
        {items.length === 0 && <div className="empty">No match</div>}
      </div>
    </>
  );
}

