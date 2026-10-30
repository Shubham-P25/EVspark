"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Lightning } from "@phosphor-icons/react";
import { Button } from "@/components/torque/primitives";
import { useApi, type Me } from "@/lib/api";

export default function PostAuth() {
  const api = useApi();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const ran = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setErr(null);
    try {
      const { user } = await api<{ user: Me }>("/api/me/sync", { method: "POST" });
      router.replace(!user.onboarded ? "/onboarding" : user.role === "OPERATOR" || user.role === "ADMIN" ? "/station" : "/driver");
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => {
    if (isLoaded && isSignedIn && !ran.current) {
      ran.current = true;
      void run();
    }
  }, [isLoaded, isSignedIn]);

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
        <span className="brand-mark pulse" style={{ width: 56, height: 56, borderRadius: 18 }}>
          <Lightning size={28} weight="fill" />
        </span>
        {err ? (
          <>
            <p className="err">{err}</p>
            <Button variant="primary" onClick={() => { ran.current = true; void run(); }}>
              Try again
            </Button>
          </>
        ) : (
          <p className="sub">Setting up your workspace…</p>
        )}
      </div>
    </div>
  );
}

