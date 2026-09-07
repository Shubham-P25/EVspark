"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: string };
export function Sidebar({ role, items }: { role: "operator" | "admin"; items: NavItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  return <aside className={cn("hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 md:block", collapsed ? "w-16" : "w-60")}><div className="flex h-full min-h-screen flex-col p-4"><Link href="/" className="flex items-center gap-3 px-2 py-2 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-bg">⚡</span>{!collapsed && <span>EV<span className="text-primary">spark</span></span>}</Link>{!collapsed && <p className="mt-8 px-2 font-mono text-[10px] uppercase tracking-widest text-muted">{role} console</p>}<nav className="mt-4 space-y-1">{items.map((item) => <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm text-muted transition-colors hover:bg-surface-3 hover:text-text"><span className="w-6 text-center font-mono text-xs text-primary">{item.icon}</span>{!collapsed && item.label}</Link>)}</nav><div className="mt-auto"><button onClick={() => setCollapsed(!collapsed)} className="w-full border-t border-border-dim pt-4 text-left text-xs text-muted hover:text-text">{collapsed ? "→" : "← Collapse"}</button><Link href="/" className="mt-4 block px-2 text-xs text-muted hover:text-primary">{collapsed ? "↩" : "Sign out"}</Link></div></div></aside>;
}