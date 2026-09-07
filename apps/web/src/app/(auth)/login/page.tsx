"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO } from "@/lib/api";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const enterDemo = (role: "driver" | "operator" | "admin") => { document.cookie = `demoRole=${role}; path=/`; router.push(`/${role}`); };
  return <main className="flex min-h-screen items-center justify-center px-6 py-12"><section className="w-full max-w-sm rounded-lg border border-border bg-surface p-7"><Link className="flex items-center justify-center gap-2 font-semibold" href="/"><span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-bg">⚡</span>EV<span className="text-primary">spark</span></Link><h1 className="mt-8 text-center text-xl font-semibold">Sign in to EVspark</h1><form className="mt-8 space-y-4" onSubmit={(event) => { event.preventDefault(); router.push("/driver"); }}><label className="block text-sm text-muted">Email<input className="mt-2 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-text outline-none focus:border-primary" type="email" required /></label><label className="block text-sm text-muted">Password<input className="mt-2 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-text outline-none focus:border-primary" type="password" required /></label><Button className="w-full" size="lg">Sign in</Button></form>{DEMO && <div className="mt-8 border-t border-border-dim pt-5"><p className="font-mono text-[10px] uppercase tracking-wider text-muted">Demo access</p><div className="mt-3 grid gap-2"><Button size="sm" variant="secondary" onClick={() => enterDemo("driver")}>Enter as Driver Demo</Button><Button size="sm" variant="secondary" onClick={() => enterDemo("operator")}>Enter as Operator Demo</Button><Button size="sm" variant="secondary" onClick={() => enterDemo("admin")}>Enter as Admin Demo</Button></div></div>}<p className="mt-7 text-center text-sm text-muted">New to EVspark? <Link className="text-primary hover:text-text" href="/register">Create an account</Link></p></section></main>;
}